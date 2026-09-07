"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Source = { id: string; name: string; type: "text" | "url"; value: string };

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([
    { id: crypto.randomUUID(), name: "Source 1", type: "text", value: "" },
  ]);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const update = (id: string, patch: Partial<Source>) =>
    setSources((items) => items.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const add = () =>
    setSources((items) => [
      ...items,
      { id: crypto.randomUUID(), name: `Source ${items.length + 1}`, type: "text", value: "" },
    ]);

  const combine = async () => {
    const usable = sources.filter((s) => s.value.trim());
    if (!usable.length) return;
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/source/ingest-many`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: usable.map((s) =>
            s.type === "url"
              ? { id: s.id, name: s.name, type: "url", url: s.value }
              : { id: s.id, name: s.name, type: "text", text: s.value },
          ),
        }),
      });
      setResult(await response.json());
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="workspace-shell">
      <section className="workspace-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CONTENT INTELLIGENCE</span>
            <h1>Multi-source workspace</h1>
            <p>Combine text and URLs into one grounded source while preserving source boundaries.</p>
          </div>
          <button className="secondary-button" onClick={add}>+ Add source</button>
        </div>

        <div className="source-stack">
          {sources.map((source) => (
            <article className="source-card" key={source.id}>
              <div className="source-card-header">
                <input value={source.name} onChange={(e) => update(source.id, { name: e.target.value })} />
                <select value={source.type} onChange={(e) => update(source.id, { type: e.target.value as Source["type"], value: "" })}>
                  <option value="text">Text</option>
                  <option value="url">URL</option>
                </select>
                {sources.length > 1 && <button className="ghost-button" onClick={() => setSources(sources.filter((s) => s.id !== source.id))}>Remove</button>}
              </div>
              <textarea
                rows={7}
                placeholder={source.type === "url" ? "https://example.com/article" : "Paste source material here..."}
                value={source.value}
                onChange={(e) => update(source.id, { value: e.target.value })}
              />
            </article>
          ))}
        </div>

        <button className="primary-button" disabled={busy} onClick={combine}>
          {busy ? "Combining sources..." : "Combine & analyze sources"}
        </button>

        {result && (
          <div className="source-result">
            <div className="result-title">{result.ok ? `✓ ${result.count} source(s) combined` : "Source ingestion failed"}</div>
            <p>{result.message}</p>
            {result.combined && <pre>{result.combined}</pre>}
          </div>
        )}
      </section>
    </main>
  );
}
