import { Injectable } from '@nestjs/common';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import ffmpegPath from 'ffmpeg-static';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MediaService {
  async generateImage(prompt: string) {
    const cleanPrompt = prompt.trim() || 'Create a polished factual infographic.';
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const model = process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell';

    if (!accountId || !apiToken) {
      return { ok: false, status: 'needs_api_key', provider: 'cloudflare', message: 'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required for image generation. Add them to backend/.env.' };
    }

    try {
      const plan = await this.createInfographicPlan(cleanPrompt);
      const visualPrompt = plan.visual_prompt || cleanPrompt;
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: visualPrompt.slice(0, 2048) }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) throw new Error(`Cloudflare returned HTTP ${response.status}: ${(await response.text()).slice(0, 700)}`);

      const contentType = response.headers.get('content-type') || '';
      let backgroundData = '';
      let backgroundMime = 'image/jpeg';
      if (contentType.startsWith('image/')) {
        backgroundMime = contentType.split(';')[0] || 'image/jpeg';
        backgroundData = Buffer.from(await response.arrayBuffer()).toString('base64');
      } else {
        const payload: any = await response.json();
        const result = payload?.result ?? payload;
        const image = result?.image ?? result?.data;
        if (typeof image !== 'string') throw new Error('Cloudflare image response did not contain base64 image data.');
        backgroundData = image.replace(/^data:image\/[^;]+;base64,/, '');
        backgroundMime = result?.mimeType || result?.mime_type || 'image/jpeg';
      }

      const svg = this.buildInfographicSvg(backgroundData, backgroundMime, plan);
      return {
        ok: true,
        type: 'image',
        provider: 'cloudflare',
        model,
        mimeType: 'image/svg+xml',
        filename: 'transformai-infographic.svg',
        data: Buffer.from(svg, 'utf8').toString('base64'),
        background_data: backgroundData,
        background_mimeType: backgroundMime,
        text_rendered_separately: true,
        language: plan.language,
      };
    } catch (error) {
      return { ok: false, status: 'image_generation_failed', provider: 'cloudflare', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async createInfographicPlan(sourcePrompt: string) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return { language: 'English', title: 'TransformAI Infographic', subtitle: '', facts: [] as string[], visual_prompt: `Create a clean professional infographic background and illustrations. No text, no letters, no numbers, no labels, no typography. ${sourcePrompt}` };
    }
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const { text } = await generateText({
        model: google(process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'),
        temperature: 0.1,
        prompt: `You are an infographic art director. Extract a compact, factual text layout from the supplied source and separately describe the visual background. Preserve the requested/source language. Never invent facts. Return ONLY JSON with this shape: {"language":"...","title":"...","subtitle":"...","facts":["...","...","..."],"visual_prompt":"..."}. The visual_prompt must describe ONLY the visual scene, icons, charts, composition and color mood. It MUST say: no text, no letters, no numbers, no labels, no typography. Keep title under 70 characters, subtitle under 120 characters, and at most 5 short facts. SOURCE/PROMPT:\n${sourcePrompt.slice(0, 14000)}`,
      });
      const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed: any = JSON.parse(clean);
      return {
        language: String(parsed.language || 'English'),
        title: String(parsed.title || 'TransformAI Infographic').slice(0, 120),
        subtitle: String(parsed.subtitle || '').slice(0, 220),
        facts: Array.isArray(parsed.facts) ? parsed.facts.map((x: any) => String(x).trim()).filter(Boolean).slice(0, 5) : [],
        visual_prompt: `${String(parsed.visual_prompt || 'Clean modern factual infographic background').slice(0, 1900)}. No text, no letters, no numbers, no labels, no typography.`,
      };
    } catch {
      return { language: 'English', title: 'TransformAI Infographic', subtitle: '', facts: [] as string[], visual_prompt: `Create a clean professional infographic background and illustrations. No text, no letters, no numbers, no labels, no typography. ${sourcePrompt}` };
    }
  }

  private xml(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  private wrapText(text: string, max = 58) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > max && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  private buildInfographicSvg(backgroundData: string, backgroundMime: string, plan: any) {
    const titleLines = this.wrapText(plan.title || 'TransformAI Infographic', 32).slice(0, 2);
    const subtitleLines = this.wrapText(plan.subtitle || '', 62).slice(0, 2);
    const facts = Array.isArray(plan.facts) ? plan.facts : [];
    const titleSvg = titleLines.map((line: string, i: number) => `<text x="80" y="${105 + i * 62}" class="title">${this.xml(line)}</text>`).join('');
    const subtitleStart = 105 + titleLines.length * 62 + 12;
    const subtitleSvg = subtitleLines.map((line: string, i: number) => `<text x="82" y="${subtitleStart + i * 34}" class="subtitle">${this.xml(line)}</text>`).join('');
    const factStart = subtitleStart + Math.max(1, subtitleLines.length) * 34 + 55;
    const factSvg = facts.map((fact: string, i: number) => {
      const lines = this.wrapText(fact, 55);
      const y = factStart + i * 92;
      return `<g><rect x="72" y="${y - 34}" width="1136" height="78" rx="18" class="factBox"/><circle cx="104" cy="${y - 4}" r="10" class="dot"/>${lines.map((line: string, j: number) => `<text x="132" y="${y + j * 25}" class="fact">${this.xml(line)}</text>`).join('')}</g>`;
    }).join('');
    const lang = this.xml(plan.language || 'English');
    const bgMime = this.xml(backgroundMime || 'image/jpeg');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" xml:lang="${lang}"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity=".80"/><stop offset=".48" stop-opacity=".38"/><stop offset="1" stop-opacity=".82"/></linearGradient><style><![CDATA[.title{font-family:'Nirmala UI','Noto Sans Bengali','Noto Sans Devanagari','Noto Sans','Arial',sans-serif;font-size:52px;font-weight:800;fill:#fff}.subtitle{font-family:'Nirmala UI','Noto Sans Bengali','Noto Sans Devanagari','Noto Sans','Arial',sans-serif;font-size:23px;font-weight:500;fill:#fff}.fact{font-family:'Nirmala UI','Noto Sans Bengali','Noto Sans Devanagari','Noto Sans','Arial',sans-serif;font-size:20px;font-weight:600;fill:#172033}.factBox{fill:#fff;fill-opacity:.94}.dot{fill:#2563eb}]]></style></defs><image href="data:${bgMime};base64,${backgroundData}" x="0" y="0" width="1280" height="720" preserveAspectRatio="xMidYMid slice"/><rect width="1280" height="720" fill="url(#shade)"/><rect x="48" y="48" width="1184" height="624" rx="28" fill="none" stroke="#ffffff" stroke-opacity=".24" stroke-width="2"/>${titleSvg}${subtitleSvg}${factSvg}<text x="82" y="680" class="subtitle" font-size="14">TransformAI · ${lang}</text></svg>`;
  }

  async createVideoPackage(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return { ok: false, status: 'needs_api_key', message: 'GEMINI_API_KEY is not configured for video planning.' };
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const { text } = await generateText({
        model: google(process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'),
        temperature: 0.2,
        prompt: `You are a video production planner. Create a factual short-form video package from the supplied source. Return ONLY JSON with this shape: {"title":"","duration_seconds":8,"script":"","narration":"","storyboard":[{"start":0,"end":8,"scene":"","visual":"","narration":""}],"visual_recommendations":[],"subtitles":[{"start":0,"end":4,"text":""}]}. Keep timing sequential, subtitles concise, and every factual claim grounded in the source. ${prompt}`,
      });
      const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed: any = JSON.parse(clean);
      const subtitles = Array.isArray(parsed.subtitles) ? parsed.subtitles : [];
      const normalized = subtitles.map((s: any) => ({ start: Math.max(0, Number(s.start) || 0), end: Math.max((Number(s.start) || 0) + 1, Number(s.end) || (Number(s.start) || 0) + 4), text: String(s.text || '').trim() })).filter((s: any) => s.text);
      const duration = Math.min(20, Math.max(5, Number(parsed.duration_seconds) || 8));
      const srt = normalized.map((s: any, i: number) => `${i + 1}\n${this.srtTime(s.start)} --> ${this.srtTime(Math.min(duration, s.end))}\n${s.text}\n`).join('\n');
      return { ok: true, type: 'video_package', status: 'ready', package: { ...parsed, duration_seconds: duration, subtitles: normalized, srt } };
    } catch (error) {
      return { ok: false, status: 'video_package_failed', message: error instanceof Error ? error.message : String(error) };
    }
  }

  async generateVideo(prompt: string) {
    const apiKey = process.env.LTX_API_KEY?.trim();
    const model = process.env.LTX_VIDEO_MODEL || 'ltx-2-5-fast';
    const duration = Math.min(20, Math.max(5, Number(process.env.LTX_VIDEO_DURATION || 8)));
    const resolution = process.env.LTX_VIDEO_RESOLUTION || '1280x720';
    const fps = Math.min(48, Math.max(24, Number(process.env.LTX_VIDEO_FPS || 24)));
    const generateAudio = process.env.LTX_VIDEO_AUDIO !== 'false';
    const cameraMotion = process.env.LTX_VIDEO_CAMERA_MOTION?.trim();
    const cleanPrompt = prompt.trim().slice(0, 5000) || 'Create a concise factual documentary-style video.';

    if (!apiKey) {
      return { ok: false, status: 'needs_api_key', provider: 'ltx', message: 'LTX_API_KEY is required for video generation. Add it to backend/.env.' };
    }

    try {
      const body: Record<string, unknown> = {
        prompt: cleanPrompt,
        model,
        duration,
        resolution,
        fps,
        generate_audio: generateAudio,
      };
      if (cameraMotion) body.camera_motion = cameraMotion;

      const response = await fetch('https://api.ltx.io/v1/text-to-video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(300000),
      });

      if (!response.ok) {
        const details = (await response.text()).slice(0, 1200);
        throw new Error(`LTX video returned HTTP ${response.status}: ${details}`);
      }

      const mimeType = response.headers.get('content-type') || 'video/mp4';
      const data = Buffer.from(await response.arrayBuffer());
      if (!data.length) throw new Error('LTX returned an empty video response.');

      return {
        ok: true,
        type: 'video',
        provider: 'ltx',
        model,
        mimeType,
        filename: 'transformai-video.mp4',
        data: data.toString('base64'),
        duration_seconds: duration,
        resolution,
        fps,
        audio: generateAudio,
      };
    } catch (error) {
      return {
        ok: false,
        status: 'video_generation_failed',
        provider: 'ltx',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async renderVideoPackage(videoPackage: any, background?: { data?: string; mimeType?: string }) {
    const executable = ffmpegPath;
    if (!executable) return { ok: false, status: 'ffmpeg_unavailable', message: 'FFmpeg binary is unavailable in this installation.' };
    const duration = Math.min(300, Math.max(5, Number(videoPackage?.duration_seconds) || 60));
    const subtitles = Array.isArray(videoPackage?.subtitles) ? videoPackage.subtitles : [];
    const work = join(tmpdir(), `transformai-${randomUUID()}`);
    const srtPath = join(work, 'subtitles.srt');
    const outPath = join(work, 'transformai-video.mp4');
    const backgroundPath = join(work, `background.${(background?.mimeType || 'image/jpeg').includes('png') ? 'png' : 'jpg'}`);
    try {
      await fs.mkdir(work, { recursive: true });
      const srt = subtitles.map((s: any, i: number) => `${i + 1}\n${this.srtTime(Math.max(0, Number(s.start) || 0))} --> ${this.srtTime(Math.min(duration, Math.max((Number(s.start) || 0) + 1, Number(s.end) || (Number(s.start) || 0) + 4)))}\n${String(s.text || '').replace(/\r?\n/g, ' ').trim()}\n`).join('\n');
      await fs.writeFile(srtPath, srt, 'utf8');

      const args: string[] = ['-y'];
      if (background?.data) {
        await fs.writeFile(backgroundPath, Buffer.from(background.data, 'base64'));
        args.push('-loop', '1', '-i', backgroundPath);
      } else {
        args.push('-f', 'lavfi', '-i', `color=c=0x101827:s=1280x720:r=30:d=${duration}`);
      }

      const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
      const filters = background?.data
        ? `scale=1400:788:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0005,1.08)':d=${Math.round(duration * 30)}:s=1280x720:fps=30,format=yuv420p${subtitles.length ? `,subtitles='${escapedSrt}'` : ''}`
        : `format=yuv420p${subtitles.length ? `,subtitles='${escapedSrt}'` : ''}`;
      args.push('-vf', filters, '-t', String(duration), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outPath);

      await new Promise<void>((resolve, reject) => {
        const child: ReturnType<typeof spawn> = spawn(executable, args, { windowsHide: true });
        let stderr = '';
        child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        child.on('error', reject);
        child.on('close', (code: number | null) => code === 0 ? resolve() : reject(new Error(stderr.slice(-4000) || `FFmpeg exited with code ${code}`)));
      });

      const data = await fs.readFile(outPath);
      return { ok: true, type: 'video', mimeType: 'video/mp4', filename: 'transformai-video.mp4', data: data.toString('base64'), duration_seconds: duration };
    } catch (error) {
      return { ok: false, status: 'video_render_failed', message: error instanceof Error ? error.message : String(error) };
    } finally {
      await fs.rm(work, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private srtTime(seconds: number) {
    const ms = Math.max(0, Math.round(seconds * 1000));
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const x = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(x).padStart(3, '0')}`;
  }
}
