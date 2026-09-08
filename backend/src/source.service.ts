import { Injectable } from '@nestjs/common';

export type SourceInput = {
  id?: string;
  type?: string;
  name?: string;
  text?: string;
  url?: string;
  content?: string;
};

export type SourceRecord = {
  id: string;
  name: string;
  type: string;
  url?: string;
  content: string;
};

@Injectable()
export class SourceService {
  async ingest(b: SourceInput) {
    if (b.content?.trim()) return this.normalized(b, b.content.trim());
    if (b.text?.trim()) return this.normalized(b, b.text.trim());

    if (b.url?.trim()) {
      const url = b.url.trim();
      try {
        new URL(url);
      } catch {
        return { ok: false, type: 'url', url, content: '', message: 'Please enter a valid webpage URL, including https://.' };
      }

      try {
        const extracted = await this.extractWithTavily(url);
        if (extracted) return this.normalized({ ...b, type: 'url', url }, extracted);
      } catch {
        // Fall through to the direct webpage extractor.
      }

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TransformAI/1.0; +https://github.com/Somnath-Sarkar008/ai-content-transformation-platform)',
            Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        const raw = await response.text();
        const text = contentType.includes('text/plain') ? raw : this.extractHtmlText(raw);
        if (text.length < 40) throw new Error('The webpage did not contain enough readable text.');
        return this.normalized({ ...b, type: 'url', url }, text.slice(0, 50000));
      } catch (error) {
        return {
          ok: false,
          type: 'url',
          url,
          content: '',
          message: error instanceof Error
            ? `Unable to read this webpage: ${error.message}. Try enabling research or pasting the page text.`
            : 'Unable to read this webpage. Try enabling research or pasting the page text.',
        };
      }
    }

    return { ok: false, type: 'empty', content: '', message: 'Source is empty.' };
  }

  async ingestMany(sources: SourceInput[]) {
    const inputs = Array.isArray(sources) ? sources.slice(0, 20) : [];
    const results = await Promise.all(inputs.map((source) => this.ingest(source)));
    const accepted = results.filter((r) => r.ok !== false && r.content?.trim());
    const failed = results.filter((r) => r.ok === false);
    const records: SourceRecord[] = accepted.map((r: any, index) => ({
      id: String(r.id || `source-${index + 1}`),
      name: String(r.name || r.url || `Source ${index + 1}`),
      type: String(r.type || 'text'),
      url: r.url,
      content: String(r.content).slice(0, 50000),
    }));
    const combined = records
      .map(
        (r) =>
          `SOURCE_ID: ${r.id}\nSOURCE_NAME: ${r.name}\nSOURCE_TYPE: ${r.type}${r.url ? `\nSOURCE_URL: ${r.url}` : ''}\nSOURCE_CONTENT:\n${r.content}`,
      )
      .join('\n\n--- SOURCE BOUNDARY ---\n\n');

    return {
      ok: records.length > 0,
      count: records.length,
      failed: failed.length,
      sources: results,
      records,
      combined: combined.slice(0, 120000),
      message: records.length
        ? `${records.length} source(s) combined with provenance boundaries.`
        : 'No usable sources were found.',
    };
  }

  private async extractWithTavily(url: string): Promise<string | null> {
    const apiKey = process.env.TAVILY_API_KEY?.trim();
    if (!apiKey) return null;

    const response = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [url],
        extract_depth: 'advanced',
        include_images: false,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) throw new Error(`Tavily Extract HTTP ${response.status}`);
    const data: any = await response.json();
    const result = Array.isArray(data?.results) ? data.results[0] : null;
    const content = String(result?.raw_content || result?.content || '').trim();
    return content || null;
  }

  private extractHtmlText(html: string) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalized(b: SourceInput, content: string) {
    return {
      ok: true,
      id: b.id,
      type: b.type || 'text',
      name: b.name,
      url: b.url,
      content: content.slice(0, 50000),
      source: (b.name || b.url || content).slice(0, 160),
    };
  }
}
