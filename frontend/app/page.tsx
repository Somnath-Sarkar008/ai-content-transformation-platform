"use client";

import { useState } from "react";

const outputs = ["LinkedIn Post","X / Thread","Advisory","Executive Summary","Presentation","Infographic","Video Package"];

export default function Home() {
  const [source, setSource] = useState("");
  const [selected, setSelected] = useState(["LinkedIn Post", "Presentation"]);
  const [status, setStatus] = useState("Ready");
  const [result, setResult] = useState("");

  const toggle = (name: string) => setSelected((s) => s.includes(name) ? s.filter(x => x !== name) : [...s, name]);
  const generate = async () => {
    if (!source.trim() || !selected.length) return;
    setStatus("Generating…"); setResult("");
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/transform`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({source,outputs:selected}) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Generation failed");
      setResult(data.result || JSON.stringify(data,null,2)); setStatus("Verified output ready");
    } catch (e) { setStatus("Prototype mode — backend not connected"); setResult("Your workflow is configured. Start the NestJS backend and add GEMINI_API_KEY to generate live outputs.\n\nSelected: " + selected.join(", ")); }
  };

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><span className="brandIcon">✦</span> TransformAI</div><div className="nav"><button className="active">⌂ Workspace</button><button>◇ Workflows</button><button>◷ History</button><button>⚙ Settings</button></div><div className="footer">SIH 2026 · Prototype</div></aside>
    <main className="main"><div className="top"><div><div className="eyebrow">Agentic content studio</div><div className="title">Transform information into anything.</div><div className="muted">One source → intelligent orchestration → multiple verified outputs.</div></div><div className="status"><span className="dot"/> {status}</div></div>
      <div className="workspace"><section>
        <div className="card"><h2>1 · Source content</h2><div className="drop"><strong>Drop files, paste a URL, or use the prompt</strong><span className="muted">PDF · DOCX · TXT · image · video · URL</span></div><textarea className="textarea" style={{marginTop:12}} value={source} onChange={e=>setSource(e.target.value)} placeholder="Paste an article, report, advisory, announcement, research text, or describe what you want to transform…"/></div>
        <div className="flow"><div className="node"><b>Source</b><span>Text / files / URL</span></div><span className="arrow">→</span><div className="node"><b>Analyze</b><span>Facts + context</span></div><span className="arrow">→</span><div className="node"><b>Orchestrate</b><span>Gemini agent</span></div><span className="arrow">→</span><div className="node"><b>Generate</b><span>Specialized agents</span></div><span className="arrow">→</span><div className="node"><b>Verify</b><span>Quality guardian</span></div></div>
        <div className="card output"><h2>Live output preview</h2><div className="result">{result || "Generated artifacts will appear here. The same Content Intelligence Object feeds every output so facts stay consistent."}</div></div>
      </section>
      <aside><div className="card"><h2>2 · Output formats</h2><div className="row">{outputs.map(o=><button key={o} className={`chip ${selected.includes(o)?"selected":""}`} onClick={()=>toggle(o)}>{o}</button>)}</div><div style={{height:18}}/><h2>3 · Transformation controls</h2><div className="field"><label>Target audience</label><select className="select"><option>General audience</option><option>Executive / leadership</option><option>Technical</option><option>Public / social</option></select></div><div className="field"><label>Tone</label><select className="select"><option>Professional</option><option>Concise</option><option>Formal</option><option>Engaging</option></select></div><div className="field"><label>Language</label><select className="select"><option>English</option><option>Hindi</option><option>Bengali</option></select></div><div className="field"><label>Detail</label><select className="select"><option>Balanced</option><option>Brief</option><option>Detailed</option></select></div><button className="generate" disabled={!source.trim() || !selected.length} onClick={generate}>✦ Generate & Verify</button></div></aside></div>
    </main></div>;
}
