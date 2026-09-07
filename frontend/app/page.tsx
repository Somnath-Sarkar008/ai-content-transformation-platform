"use client";

import { useState } from "react";

type OutputValue = string | { title?: string; sections?: { heading?: string; content?: string }[]; visual_elements_suggestion?: string[]; slides?: { title?: string; bullets?: string[]; speakerNotes?: string }[]; script?: string; storyboard?: unknown[]; narration?: string };
type Content = { title?: string; summary?: string; facts?: { id?: string; text?: string }[]; entities?: { name?: string; description?: string }[]; outputs?: Record<string, OutputValue>; quality?: { score?: number; passed?: boolean; issues?: string[] } };

const outputs = ["LinkedIn Post", "X / Thread", "Advisory", "Executive Summary", "Presentation", "Infographic", "Video Package"];

function OutputCard({ name, value }: { name: string; value: OutputValue }) {
  if (typeof value === "string") {
    return <div className="artifact-card"><div className="artifact-head"><span className="artifact-type">{name}</span><button className="copy-btn" onClick={() => navigator.clipboard?.writeText(value)}>Copy</button></div><p className="artifact-text">{value}</p></div>;
  }

  return <div className="artifact-card">
    <div className="artifact-head"><span className="artifact-type">{name}</span><button className="copy-btn" onClick={() => navigator.clipboard?.writeText(JSON.stringify(value, null, 2))}>Copy JSON</button></div>
    {value.title && <h4>{value.title}</h4>}
    {value.sections?.map((section, index) => <div className="section-block" key={`${section.heading}-${index}`}><strong>{section.heading}</strong><p>{section.content}</p></div>)}
    {value.slides?.map((slide, index) => <div className="slide-card" key={`${slide.title}-${index}`}><span>Slide {index + 1}</span><strong>{slide.title}</strong>{slide.bullets?.map((bullet) => <p key={bullet}>• {bullet}</p>)}{slide.speakerNotes && <small>Speaker notes: {slide.speakerNotes}</small>}</div>)}
    {value.script && <div className="section-block"><strong>Script</strong><p>{value.script}</p></div>}
    {value.narration && <div className="section-block"><strong>Narration</strong><p>{value.narration}</p></div>}
    {value.visual_elements_suggestion?.length ? <div className="suggestions"><strong>Visual direction</strong>{value.visual_elements_suggestion.map((item) => <span key={item}>✦ {item}</span>)}</div> : null}
  </div>;
}

function ResultView({ content }: { content: Content }) {
  const artifactEntries = Object.entries(content.outputs || {});
  return <div className="result-view">
    {content.title && <h3 className="result-title">{content.title}</h3>}
    {content.summary && <p className="result-summary">{content.summary}</p>}
    {!!content.facts?.length && <div className="intel-section"><div className="section-label">Content intelligence · Facts</div><div className="fact-grid">{content.facts.map((fact, index) => <div className="fact" key={fact.id || index}><span>✓</span><p>{fact.text}</p></div>)}</div></div>}
    {!!content.entities?.length && <div className="intel-section"><div className="section-label">Entities</div><div className="entity-list">{content.entities.map((entity) => <div className="entity" key={entity.name}><strong>{entity.name}</strong><span>{entity.description}</span></div>)}</div></div>}
    {!!artifactEntries.length && <div className="intel-section"><div className="section-label">Generated artifacts</div><div className="artifacts">{artifactEntries.map(([name, value]) => <OutputCard key={name} name={name} value={value} />)}</div></div>}
    {content.quality && <div className={`quality ${content.quality.passed ? "passed" : "review"}`}><div><strong>{content.quality.passed ? "✓ Verified" : "⚠ Needs review"}</strong><span>Quality Guardian</span></div><b>{content.quality.score ?? 0}/100</b>{content.quality.issues?.length ? <p>{content.quality.issues.join(" · ")}</p> : <p>No consistency or validation issues reported.</p>}</div>}
  </div>;
}

export default function Home() {
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState(["LinkedIn Post", "Presentation"]);
  const [content, setContent] = useState<Content | null>(null);
  const [status, setStatus] = useState("Ready");
  const [controls, setControls] = useState({ audience: "General audience", tone: "Professional", language: "English", detail: "Balanced" });
  const toggle = (x: string) => setSelected((s) => s.includes(x) ? s.filter((y) => y !== x) : [...s, x]);

  async function generate() {
    setStatus("Generating…"); setContent(null);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/transform`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, outputs: selected, ...controls }) });
      const d = await r.json().catch(() => ({ message: "Backend returned an invalid response." }));
      if (!r.ok || d.ok === false) throw Error(d.message || `Request failed with HTTP ${r.status}`);
      setContent(d.content); setStatus(d.status === "verified" ? "Verified" : "Completed");
    } catch (error) { const message = error instanceof Error ? error.message : String(error); setStatus("Generation failed"); setContent({ title: "Generation failed", summary: message }); }
  }

  return <div className="shell"><aside className="sidebar"><div className="brand"><span className="brandIcon">✦</span>TransformAI</div><div className="nav"><button className="active">⌂ Workspace</button><button>◇ Workflows</button><button>◷ History</button><button>⚙ Settings</button></div><div className="footer">SIH 2026 · Prototype</div></aside><main className="main"><div className="top"><div><div className="eyebrow">Agentic content studio</div><div className="title">Transform information into anything.</div><div className="muted">One source → orchestration → multiple verified outputs.</div></div><div className="status"><span className="dot"/>{status}</div></div><div className="workspace"><section><div className="card"><h2>1 · Source content</h2><div className="drop"><strong>Drop files, paste a URL, or use the prompt</strong><span className="muted">PDF · DOCX · TXT · image · video · URL</span></div><textarea className="textarea" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste an article, report, advisory, research paper, announcement, or prompt…"/></div><div className="flow">{[["Source","Text / files / URL"],["Analyze","Facts + context"],["Orchestrate","Gemini agent"],["Generate","Specialized agents"],["Verify","Quality guardian"]].map((n, i) => <span key={n[0]} style={{ display: "contents" }}><div className="node"><b>{n[0]}</b><span>{n[1]}</span></div>{i < 4 && <span className="arrow">→</span>}</span>)}</div><div className="card output"><div className="output-header"><div><h2>Live output preview</h2><span className="muted">Structured, human-readable transformation results</span></div>{content?.quality && <span className={`score-pill ${content.quality.passed ? "ok" : "warn"}`}>● {content.quality.score ?? 0}/100</span>}</div>{content ? <ResultView content={content}/> : <div className="empty-result"><span>✦</span><strong>Your transformed content will appear here</strong><p>Choose one or more formats and run the transformation pipeline.</p></div>}</div></section><aside><div className="card"><h2>2 · Output formats</h2><div className="row">{outputs.map((o) => <button key={o} className={`chip ${selected.includes(o) ? "selected" : ""}`} onClick={() => toggle(o)}>{o}</button>)}</div><div style={{ height: 18 }}/><h2>3 · Transformation controls</h2>{[["audience","Target audience",["General audience","Executive / leadership","Technical","Public / social"]],["tone","Tone",["Professional","Concise","Formal","Engaging"]],["language","Language",["English","Hindi","Bengali"]],["detail","Detail",["Balanced","Brief","Detailed"]]].map(([key, label, opts]) => <div className="field" key={key as string}><label>{label as string}</label><select className="select" value={controls[key as keyof typeof controls]} onChange={(e) => setControls((c) => ({ ...c, [key as keyof typeof controls]: e.target.value }))}>{(opts as string[]).map((x) => <option key={x}>{x}</option>)}</select></div>)}<button className="generate" disabled={!source.trim() || !selected.length} onClick={generate}>✦ Generate & Verify</button></div></aside></div></main></div>;
}
