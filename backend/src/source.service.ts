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
      try {
        const r = await fetch(b.url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const html = await r.text();
        const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
    const records: SourceRecord[] = accepted.map((r: any, index) => ({
      id: String(r.id || `source-${index + 1}`),
      name: String(r.name || r.url || `Source ${index + 1}`),
      type: String(r.type || 'text'),
      url: r.url,
      content: String(r.content).slice(0, 50000),
    }));
    const combined = records.map((r) => `SOURCE_ID: ${r.id}\nSOURCE_NAME: ${r.name}\nSOURCE_TYPE: ${r.type}${r.url ? `\nSOURCE_URL: ${r.url}` : ''}\nSOURCE_CONTENT:\n${r.content}`).join('\n\n--- SOURCE BOUNDARY ---\n\n');
    return {
      ok: records.length > 0,
      count: records.length,
      failed: failed.length,
      sources: results,
      records,
      combined: combined.slice(0, 120000),
      message: records.length ? `${records.length} source(s) combined with provenance boundaries.` : 'No usable sources were found.'
    };
  }

  private normalized(b: SourceInput, content: string) {
    return { ok: true, id: b.id, type: b.type || 'text', name: b.name, url: b.url, content: content.slice(0, 50000), source: (b.name || b.url || content).slice(0, 160) };
  }
}
