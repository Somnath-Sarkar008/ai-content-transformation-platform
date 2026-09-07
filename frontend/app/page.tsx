"use client";

import { useRef, useState } from "react";

type OutputValue = string | { title?: string; sections?: { heading?: string; content?: string }[]; visual_elements_suggestion?: string[]; slides?: { title?: string; bullets?: string[]; speakerNotes?: string }[]; script?: string; storyboard?: { scene?: string; visual?: string; narration?: string }[]; narration?: string };
type Content = { title?: string; summary?: string; facts?: { id?: string; text?: string }[]; entities?: { name?: string; description?: string }[]; outputs?: Record<string, OutputValue>; quality?: { score?: number; passed?: boolean; issues?: string[] } };

const outputs = ["LinkedIn Post", "X / Thread", "Advisory", "Executive Summary", "Presentation", "Infographic", "Video Package"];
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function OutputCard({ name, value, onExport }: { name: string; value: OutputValue; onExport: (kind: string, value: OutputValue) => void }) {
  const copy = () => navigator.clipboard?.writeText(typeof value === "string" ? value : JSON.stringify(value, null, 2));
  return <div className="artifact-card">
    <div className="artifact-head"><span className="artifact-type">{name}</span><div className="artifact-actions"><button className="copy-btn" onClick={copy}>Copy</button>{name === "Presentation" ? <button className="copy-btn" onClick={() => onExport("pptx", value)}>Download PPTX</button> : <><button className="copy-btn" onClick={() => onExport("pdf", value)}>PDF</button><button className="copy-btn" onClick={() => onExport("docx", value)}>DOCX</button></>}</div></div>
    {typeof value === "string" ? <p className="artifact-text">{value}</p> : <>
      {value.title && <h4>{value.title}</h4>}
      {value.sections?.map((section, index) => <div className="section-block" key={`${section.heading}-${index}`}><strong>{section.heading}</strong><p>{section.content}</p></div>)}
      {value.slides?.map((slide, index) => <div className="slide-card" key={`${slide.title}-${index}`}><span>Slide {index + 1}</span><strong>{slide.title}</strong>{slide.bullets?.map((bullet) => <p key={bullet}>• {bullet}</p>)}{slide.speakerNotes && <small>Speaker notes: {slide.speakerNotes}</small>}</div>)}
      {value.script && <div className="section-block"><strong>Script</strong><p>{value.script}</p></div>}
      {value.narration && <div className="section-block"><strong>Narration</strong><p>{value.narration}</p></div>}
      {!!value.storyboard?.length && <div className="storyboard">{value.storyboard.map((scene, i) => <div className="scene" key={i}><span>Scene {i + 1}</span><strong>{scene.scene || "Scene"}</strong><p>{scene.visual}</p>{scene.narration && <small>{scene.narration}</small>}</div>)}</div>}
      {!!value.visual_elements_suggestion?.length && <div className="suggestions"><strong>Visual direction</strong>{value.visual_elements_suggestion.map((item) => <span key={item}>✦ {item}</span>)}</div>}
    </>}
  </div>;
}

function ResultView({ content, onExport }: { content: Content; onExport: (kind: string, value: OutputValue) => void }) {
  return <div className="result-view">
    {content.title && <h3 className="result-title">{content.title}</h3>}
    {content.summary && <p className="result-summary">{content.summary}</p>}
    {!!content.facts?.length && <div className="intel-section"><div className="section-label">Content intelligence · Facts</div><div className="fact-grid">{content.facts.map((fact, index) => <div className="fact" key={fact.id || index}><span>✓</span><p>{fact.text}</p></div>)}</div></div>}
    {!!content.entities?.length && <div className="intel-section"><div className="section-label">Entities</div><div className="entity-list">{content.entities.map((entity, index) => <div className="entity" key={`${entity.name}-${index}`}><strong>{entity.name}</strong><span>{entity.description}</span></div>)}</div></div>}
    {!!Object.keys(content.outputs || {}).length && <div className="intel-section"><div className="section-label">Generated artifacts</div><div className="artifacts">{Object.entries(content.outputs || {}).map(([name, value]) => <OutputCard key={name} name={name} value={value} onExport={onExport} />)}</div></div>}
    {content.quality && <div className={`quality ${content.quality.passed ? "passed" : "review"}`}><div><strong>{content.quality.passed ? "✓ Verified" : "⚠ Needs review"}</strong><span>Quality Guardian</span></div><b>{content.quality.score ?? 0}/100</b>{content.quality.issues?.length ? <p>{content.quality.issues.join(" · ")}</p> : <p>No consistency or validation issues reported.</p>}</div>}
  </div>;
}

export default function Home() {
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState(["LinkedIn Post", "Presentation"]);
  const [content, setContent] = useState<Content | null>(null);
  const [status, setStatus] = useState("Ready");
  const [research, setResearch] = useState(false);
  const [fileName, setFileName] = useState("");
  const [controls, setControls] = useState({ audience: "General audience", tone: "Professional", language: "English", detail: "Balanced" });
  const fileRef = useRef<HTMLInputElement>(null);
  const toggle = (x: string) => setSelected((s) => s.includes(x) ? s.filter((y) => y !== x) : [...s, x]);

  async function useUrl() {
    if (!url.trim()) return;
    setStatus("Fetching URL…");
    try {
      const r = await fetch(`${API}/api/source/ingest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const d = await r.json();
      if (!r.ok || !d.content) throw Error(d.message || "Could not read URL");
      setSource(d.content); setFileName(`URL · ${url}`); setStatus("URL loaded");
    } catch (e) { setStatus(e instanceof Error ? e.message : "URL fetch failed"); }
  }

  async function upload(file?: File) {
    if (!file) return;
    setFileName(file.name); setStatus(`Extracting ${file.name}…`);
    const form = new FormData(); form.append("file", file);
    try {
      const r = await fetch(`${API}/api/sources/upload`, { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok || d.ok === false) throw Error(d.message || "Upload failed");
      if (d.content) setSource(d.content);
      setStatus(d.type === "image" || d.type === "video" ? "Media accepted" : "Source extracted");
    } catch (e) { setStatus(e instanceof Error ? e.message : "Upload failed"); }
  }

  async function generate() {
    if (!source.trim() || !selected.length) return;
    setStatus("Generating → verifying…"); setContent(null);
    try {
      const r = await fetch(`${API}/api/transform`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, outputs: selected, research, ...controls }) });
      const d = await r.json().catch(() => ({ message: "Backend returned an invalid response." }));
      if (!r.ok || d.ok === false) throw Error(d.message || `Request failed with HTTP ${r.status}`);
      setContent(d.content); setStatus(d.status === "verified" ? "Verified" : "Completed");
    } catch (e) { setStatus("Generation failed"); setContent({ title: "Generation failed", summary: e instanceof Error ? e.message : String(e) }); }
  }

  async function download(kind: string, value: OutputValue) {
    setStatus(`Preparing ${kind.toUpperCase()}…`);
    try {
      const endpoint = `${API}/api/export/${kind}`;
      const payload: any = { title: content?.title || "TransformAI Output" };
      if (kind === "pptx") payload.slides = typeof value !== "string" && value.slides?.length ? value.slides : [{ title: payload.title, bullets: [typeof value === "string" ? value : value.title || "Generated content"] }];
      else payload.sections = typeof value === "string" ? [{ heading: "Generated content", text: value }] : (value.sections || [{ heading: value.title || "Generated content", text: value.script || value.narration || "Generated content" }]);
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw Error((await r.text()) || `Export failed (${r.status})`);
      const blob = await r.blob(); const objectUrl = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = objectUrl; a.download = kind === "pptx" ? "transformai-presentation.pptx" : kind === "pdf" ? "transformai-report.pdf" : "transformai-report.docx"; a.click(); URL.revokeObjectURL(objectUrl); setStatus("Verified · Export ready");
    } catch (e) { setStatus(e instanceof Error ? e.message : "Export failed"); }
  }

  return <div className="shell"><aside className="sidebar"><div className="brand"><span className="brandIcon">✦</span>TransformAI</div><div className="nav"><button className="active">⌂ Workspace</button><button onClick={() => location.href = "/workflows"}>◇ Workflows</button><button>◷ History</button><button>⚙ Settings</button></div><div className="footer">SIH 2026 · Prototype</div></aside><main className="main"><div className="top"><div><div className="eyebrow">Agentic content studio</div><div className="title">Transform information into anything.</div><div className="muted">One source → orchestration → multiple verified outputs.</div></div><div className="status"><span className="dot"/>{status}</div></div><div className="workspace"><section><div className="card"><h2>1 · Source content</h2><div className="drop" onClick={() => fileRef.current?.click()}><strong>Drop files or click to upload</strong><span className="muted">PDF · DOCX · TXT · image · video · up to 25 MB</span>{fileName && <small>{fileName}</small>}<input ref={fileRef} hidden type="file" accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.html,image/*,video/*" onChange={(e) => upload(e.target.files?.[0])}/></div><div style={{ display: "flex", gap: 8, margin: "10px 0" }}><input className="textarea" style={{ minHeight: 44 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Or paste a webpage URL…"/><button className="copy-btn" onClick={useUrl} disabled={!url.trim()}>Load URL</button></div><textarea className="textarea" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste an article, report, advisory, research paper, announcement, or prompt…"/></div><div className="flow">{[["Source","Text / files / URL"],["Analyze","Facts + context"],["Orchestrate","Gemini agent"],["Generate","Specialized agents"],["Verify","Quality guardian"]].map((n, i) => <span key={n[0]} style={{ display: "contents" }}><div className="node"><b>{n[0]}</b><span>{n[1]}</span></div>{i < 4 && <span className="arrow">→</span>}</span>)}</div><div className="card output"><div className="output-header"><div><h2>Live output preview</h2><span className="muted">Structured, human-readable transformation results</span></div>{content?.quality && <span className={`score-pill ${content.quality.passed ? "ok" : "warn"}`}>● {content.quality.score ?? 0}/100</span>}</div>{content ? <ResultView content={content} onExport={download}/> : <div className="empty-result"><span>✦</span><strong>Your transformed content will appear here</strong><p>Choose one or more formats and run the transformation pipeline.</p></div>}</div></section><aside><div className="card"><h2>2 · Output formats</h2><div className="row">{outputs.map((o) => <button key={o} className={`chip ${selected.includes(o) ? "selected" : ""}`} onClick={() => toggle(o)}>{o}</button>)}</div><div style={{ height: 18 }}/><h2>3 · Transformation controls</h2>{[["audience","Target audience",["General audience","Executive / leadership","Technical","Public / social"]],["tone","Tone",["Professional","Concise","Formal","Engaging"]],["language","Language",["English","Hindi","Bengali"]],["detail","Detail",["Balanced","Brief","Detailed"]]].map(([key, label, opts]) => <div className="field" key={key as string}><label>{label as string}</label><select className="select" value={controls[key as keyof typeof controls]} onChange={(e) => setControls((c) => ({ ...c, [key as keyof typeof controls]: e.target.value }))}>{(opts as string[]).map((x) => <option key={x}>{x}</option>)}</select></div>)}<label style={{ display: "flex", alignItems: "center", gap: 9, margin: "14px 0", fontSize: 13, color: "#a1a1aa" }}><input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)}/> Research with Tavily before generation</label><button className="generate" disabled={!source.trim() || !selected.length} onClick={generate}>✦ Generate & Verify</button></div></aside></div></main></div>;
}
