import { Injectable } from '@nestjs/common';

export type SourceInput = {
  id?: string;
  type?: string;
  name?: string;
  text?: string;
  url?: string;
  content?: string;
};

@Injectable()
export class SourceService {
  async ingest(b: SourceInput) {
    if (b.content?.trim()) return this.normalized(b, b.content.trim());
    if (b.text?.trim()) return this.normalized(b, b.text.trim());
    if (b.url?.trim()) {
      try {
        const r = await fetch(b.url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const html = await r.text();
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return this.normalized({ ...b, type: 'url' }, text.slice(0, 50000));
      } catch {
        return { ok: false, type: 'url', url: b.url, content: '', message: 'Unable to fetch URL. Paste the source text instead.' };
      }
    }
    return { ok: false, type: 'empty', content: '', message: 'Source is empty.' };
  }

  async ingestMany(sources: SourceInput[]) {
    const inputs = Array.isArray(sources) ? sources.slice(0, 20) : [];
    const results = await Promise.all(inputs.map((source) => this.ingest(source)));
    const accepted = results.filter((r) => r.ok !== false && r.content?.trim());
    const failed = results.filter((r) => r.ok === false);
    const combined = accepted
      .map((r, index) => `SOURCE ${index + 1}${r.name ? ` — ${r.name}` : ''}${r.url ? ` — ${r.url}` : ''}\n${r.content}`)
      .join('\n\n--- SOURCE BOUNDARY ---\n\n');
    return {
      ok: accepted.length > 0,
      count: accepted.length,
      failed: failed.length,
      sources: results,
      combined: combined.slice(0, 120000),
      message: accepted.length ? `${accepted.length} source(s) combined with provenance boundaries.` : 'No usable sources were found.'
    };
  }

  private normalized(b: SourceInput, content: string) {
    return {
      ok: true,
      id: b.id,
      type: b.type || 'text',
      name: b.name,
      url: b.url,
      content: content.slice(0, 50000),
      source: (b.name || b.url || content).slice(0, 160)
    };
  }
}
