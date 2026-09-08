"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Source = { id: string; name: string; type: "text" | "url" | "file"; value: string };
type Conflict = {
  topic?: string;
  severity?: string;
  resolution?: string;
  recommendation?: string;
  claim_a?: { source_name?: string; text?: string; excerpt?: string };
  claim_b?: { source_name?: string; text?: string; excerpt?: string };
};

function saveBlob(filename: string, blob: Blob) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}

const outputOptions = [
  "Executive Summary",
  "LinkedIn Post",
  "X / Thread",
  "Advisory",
  "Presentation",
  "Infographic",
  "Video Package",
];

export default function MultiSourceWorkspace() {
  const pathname = usePathname();
  const [sources, setSources] = useState<Source[]>([
    { id: crypto.randomUUID(), name: "Source 1", type: "text", value: "" },
  ]);
  const [open, setOpen] = useState(true);
  const [running, setRunning] = useState(false);
  const [refining, setRefining] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");
  const [selected, setSelected] = useState([
    "Executive Summary",
    "LinkedIn Post",
    "Presentation",
  ]);

  if (pathname !== "/") return null;

  const add = () =>
    setSources((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        name: `Source ${s.length + 1}`,
        type: "text",
        value: "",
      },
    ]);

  const update = (id: string, patch: Partial<Source>) =>
    setSources((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const remove = (id: string) => setSources((s) => s.filter((x) => x.id !== id));

  const toggleOutput = (x: string) =>
    setSelected((s) => (s.includes(x) ? s.filter((y) => y !== x) : [...s, x]));

  async function upload(id: string, file?: File) {
    if (!file) return;
    update(id, { name: file.name, type: "file", value: "" });
    const f = new FormData();
    f.append("file", file);
    try {
      const r = await fetch(`${API}/api/sources/upload`, { method: "POST", body: f });
      const d = await r.json();
      if (!r.ok || d.ok === false) throw Error(d.message || "Upload failed");
      update(id, { value: d.content || "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  function buildOriginalSource(usable: Source[]) {
    return usable
      .map(
        (s) =>
          `SOURCE_ID: ${s.id}\nSOURCE_NAME: ${s.name}\nSOURCE_TYPE: ${s.type}\nSOURCE_CONTENT:\n${s.value.slice(0, 50000)}`,
      )
      .join("\n\n--- SOURCE BOUNDARY ---\n\n");
  }

  async function run() {
    const usable = sources.filter((s) => s.value.trim());
    if (!usable.length || !selected.length) return;
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch(`${API}/api/transform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: usable.map((s) =>
            s.type === "url"
              ? { id: s.id, name: s.name, type: "url", url: s.value }
              : { id: s.id, name: s.name, type: "text", text: s.value },
          ),
          outputs: selected,
          verify: true,
        }),
      });
      const d = await r.json();
      if (!r.ok || d.ok === false) throw Error(d.message || "Transformation failed");
      setResult({
        ...d.content,
        _originalSource: buildOriginalSource(usable),
        _outputs: selected,
        _exportSources: usable.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          url: s.type === "url" ? s.value : undefined,
          excerpt: s.value.slice(0, 240),
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function refine() {
    if (!result) return;
    setRefining(true);
    setError("");
    try {
      const issues = [
        ...(result.quality?.issues || []),
        ...(result.conflicts || [])
          .filter((c: Conflict) => c.resolution === "unresolved" || c.resolution === "needs_review")
          .map(
            (c: Conflict) =>
              `Unresolved source conflict on ${c.topic || "a claim"}: ${c.recommendation || "qualify the disagreement"}`,
          ),
      ];
      const r = await fetch(`${API}/api/transform/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: result._originalSource,
          outputs: result._outputs || selected,
          content: result,
          issues,
          audience: "General audience",
          tone: "Professional",
          language: "English",
          detail: "Balanced",
        }),
      });
      const d = await r.json();
      if (!r.ok || d.ok === false) throw Error(d.message || "Refinement failed");
      setResult({
        ...d.content,
        _originalSource: result._originalSource,
        _outputs: result._outputs || selected,
        _exportSources: result._exportSources,
        conflicts: result.conflicts || [],
        conflict_count: result.conflict_count || 0,
        unresolved_conflicts: result.unresolved_conflicts || 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefining(false);
    }
  }

  async function exportArtifact(kind: "pptx" | "pdf" | "docx", name: string, value: any) {
    setExporting(`${name}-${kind}`);
    try {
      const payload: any = {
        title: result?.title || "TransformAI Output",
        sources: result?._exportSources || [],
        verification: {
          score: result?.quality?.score,
          passed: result?.quality?.passed,
          status: result?.quality?.verification_status,
          issues: result?.quality?.issues,
          conflictCount: result?.conflict_count || 0,
          unresolvedConflicts: result?.unresolved_conflicts || 0,
        },
      };

      if (kind === "pptx") {
        payload.slides = value?.slides?.length
          ? value.slides
          : [{ title: payload.title, bullets: [typeof value === "string" ? value : value?.title || "Generated content"] }];
      } else {
        payload.sections =
          typeof value === "string"
            ? [{ heading: name, text: value }]
            : value?.sections?.length
              ? value.sections
              : [
                  {
                    heading: name,
                    text:
                      value?.script ||
                      value?.narration ||
                      (value?.key_points || []).join("\n") ||
                      "Generated content",
                  },
                ];
      }

      const r = await fetch(`${API}/api/export/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw Error((await r.text()) || "Export failed");
      saveBlob(
        kind === "pptx"
          ? "transformai-presentation.pptx"
          : kind === "pdf"
            ? "transformai-report.pdf"
            : "transformai-report.docx",
        await r.blob(),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting("");
    }
  }

  const conflicts: Conflict[] = result?.conflicts || [];
  const generated = result?.outputs || {};
  const needsReview =
    !result?.quality?.passed ||
    conflicts.some((c) => c.resolution === "unresolved" || c.resolution === "needs_review");

  return (
    <section className="multi-source-panel">
      <div className="multi-source-head">
        <div>
          <span className="eyebrow">SOURCE ORCHESTRATION · PRIMARY WORKSPACE</span>
          <h2>One workspace, multiple sources</h2>
          <p>
            The main generation pipeline accepts notes, URLs and files, detects conflicts,
            generates selected outputs, verifies them, and preserves provenance for export.
          </p>
        </div>
        <button className="ghost-button" onClick={() => setOpen((v) => !v)}>
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {open && (
        <>
          <div className="multi-source-list">
            {sources.map((s) => (
              <div className="multi-source-item" key={s.id}>
                <div className="multi-source-row">
                  <input value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} />
                  <select
                    value={s.type}
                    onChange={(e) =>
                      update(s.id, { type: e.target.value as Source["type"], value: "" })
                    }
                  >
                    <option value="text">Text / Notes</option>
                    <option value="url">URL</option>
                    <option value="file">File</option>
                  </select>
                  {sources.length > 1 && (
                    <button className="ghost-button" onClick={() => remove(s.id)}>
                      ×
                    </button>
                  )}
                </div>

                {s.type === "file" ? (
                  <label className="multi-upload">
                    {s.value ? "✓ File extracted" : "Choose file"}
                    <input
                      hidden
                      type="file"
                      accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.html,image/*,video/*"
                      onChange={(e) => upload(s.id, e.target.files?.[0])}
                    />
                  </label>
                ) : (
                  <textarea
                    rows={4}
                    value={s.value}
                    onChange={(e) => update(s.id, { value: e.target.value })}
                    placeholder={
                      s.type === "url" ? "https://example.com/article" : "Paste source notes or evidence…"
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <div className="multi-source-actions">
            <button className="secondary-button" onClick={add}>+ Add source</button>
            <button
              className="primary-button"
              disabled={running || !sources.some((s) => s.value.trim()) || !selected.length}
              onClick={run}
            >
              {running ? "Analyzing → generating → verifying…" : "Run intelligent transformation"}
            </button>
          </div>

          <div className="multi-source-item">
            <strong>Output orchestration</strong>
            <div className="row">
              {outputOptions.map((o) => (
                <button
                  key={o}
                  className={`chip ${selected.includes(o) ? "selected" : ""}`}
                  onClick={() => toggleOutput(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="conflict-review-banner">⚠ {error}</div>}

          {result && (
            <div className="multi-source-result">
              <div className="multi-result-status">
                {conflicts.length
                  ? `⚠ ${conflicts.length} source conflict${conflicts.length > 1 ? "s" : ""} detected`
                  : "✓ No source conflicts detected"}
                {result.unresolved_conflicts > 0 && <strong> · Review required</strong>}
              </div>

              {conflicts.map((c, i) => (
                <article className="conflict-card" key={i}>
                  <div className="conflict-card-top">
                    <strong>{c.topic || "Source conflict"}</strong>
                    <span>{(c.severity || "review").toUpperCase()}</span>
                  </div>
                  <div className="conflict-columns">
                    <div>
                      <small>Source A · {c.claim_a?.source_name || "Unknown"}</small>
                      <p>{c.claim_a?.text}</p>
                      <em>{c.claim_a?.excerpt}</em>
                    </div>
                    <div>
                      <small>Source B · {c.claim_b?.source_name || "Unknown"}</small>
                      <p>{c.claim_b?.text}</p>
                      <em>{c.claim_b?.excerpt}</em>
                    </div>
                  </div>
                  <p className="conflict-recommendation">
                    <strong>Recommendation:</strong>{" "}
                    {c.recommendation || "Qualify the disagreement or review the sources."}
                  </p>
                </article>
              ))}

              {result.quality && (
                <div className={`quality ${result.quality.passed ? "passed" : "review"}`}>
                  <div>
                    <strong>{result.quality.passed ? "✓ Verified" : "⚠ Needs review"}</strong>
                    <span>Quality Guardian</span>
                  </div>
                  <b>{result.quality.score ?? 0}/100</b>
                  <p>
                    {result.quality.issues?.length
                      ? result.quality.issues.join(" · ")
                      : "No validation issues reported."}
                  </p>
                  {needsReview && (
                    <button className="primary-button" disabled={refining} onClick={refine}>
                      {refining ? "Refining → re-verifying…" : "↻ Refine & Re-verify"}
                    </button>
                  )}
                </div>
              )}

              {Object.entries(generated).length > 0 && (
                <div className="source-result">
                  <div className="section-label">Verified artifacts · source-aware export</div>
                  {Object.entries(generated).map(([name, value]: any) => (
                    <div className="source-card" key={name}>
                      <div>
                        <strong>{name}</strong>
                        <p>
                          {typeof value === "string"
                            ? value.slice(0, 280)
                            : value?.title || value?.summary || "Generated artifact"}
                        </p>
                      </div>
                      <div className="artifact-actions">
                        <button className="copy-btn" disabled={!!exporting} onClick={() => exportArtifact("pdf", name, value)}>PDF</button>
                        <button className="copy-btn" disabled={!!exporting} onClick={() => exportArtifact("docx", name, value)}>DOCX</button>
                        {name === "Presentation" && (
                          <button className="copy-btn" disabled={!!exporting} onClick={() => exportArtifact("pptx", name, value)}>PPTX</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <details>
                <summary>Sources &amp; content intelligence</summary>
                <div className="source-stack">
                  {(result._exportSources || []).map((s: any) => (
                    <div className="source-card" key={s.id}>
                      <strong>{s.name}</strong>
                      <span>{s.type}</span>
                      {s.url && <small>{s.url}</small>}
                      <p>{s.excerpt}</p>
                    </div>
                  ))}
                </div>
                <pre>
                  {JSON.stringify(
                    {
                      title: result.title,
                      summary: result.summary,
                      facts: result.facts,
                      entities: result.entities,
                      claims: result.claims,
                      provenance: result.provenance,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
