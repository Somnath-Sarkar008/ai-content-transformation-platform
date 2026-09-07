"use client";

import { useState } from 'react';
import WorkflowCanvas from '../../components/WorkflowCanvas';

export default function WorkflowsPage() {
  const [source, setSource] = useState('');
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<Array<{ node: string; status: string }>>([]);
  const [result, setResult] = useState<any>(null);

  async function runWorkflow() {
    if (!source.trim()) return;
    setRunning(true); setResult(null); setEvents([]);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workflow/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, outputs: ['LinkedIn Post', 'Executive Summary', 'Presentation'], research: true })
      });
      const data = await response.json();
      setEvents(data.events || []); setResult(data);
    } catch (error) {
      setEvents([{ node: 'Workflow', status: 'Backend unavailable' }]);
    } finally { setRunning(false); }
  }

  return <main style={{ minHeight: '100vh', padding: 28, background: '#09090b', color: '#fff' }}>
    <div style={{ maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: '#71717a', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.12em' }}>TransformAI</div>
        <h1 style={{ margin: '6px 0', fontSize: 28 }}>Workflow Builder</h1>
        <p style={{ margin: 0, color: '#a1a1aa', fontSize: 13 }}>Build, inspect and execute the agentic transformation pipeline.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        <textarea value={source} onChange={e => setSource(e.target.value)} placeholder="Enter source content for this workflow…" style={{ minHeight: 90, width: '100%', padding: 14, borderRadius: 12, border: '1px solid #27272a', background: '#111113', color: '#fff', resize: 'vertical' }} />
        <button onClick={runWorkflow} disabled={running || !source.trim()} style={{ border: 0, borderRadius: 12, background: running ? '#3f3f46' : '#fff', color: '#09090b', fontWeight: 700, fontSize: 15, cursor: running ? 'wait' : 'pointer' }}>{running ? 'Running workflow…' : '▶ Run Workflow'}</button>
      </div>
      <WorkflowCanvas />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <section style={{ padding: 18, border: '1px solid #27272a', borderRadius: 14, background: '#111113' }}>
          <h2 style={{ fontSize: 15, marginTop: 0 }}>Execution trace</h2>
          {events.length ? events.map((e, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #27272a', fontSize: 13 }}><span>{e.node}</span><span style={{ color: '#a1a1aa' }}>{e.status}</span></div>) : <span style={{ color: '#71717a', fontSize: 13 }}>Run the workflow to see node-by-node progress.</span>}
        </section>
        <section style={{ padding: 18, border: '1px solid #27272a', borderRadius: 14, background: '#111113' }}>
          <h2 style={{ fontSize: 15, marginTop: 0 }}>Workflow result</h2>
          <pre style={{ maxHeight: 260, overflow: 'auto', whiteSpace: 'pre-wrap', color: '#a1a1aa', fontSize: 12 }}>{result ? JSON.stringify(result.content || result, null, 2) : 'Generated content will appear here.'}</pre>
        </section>
      </div>
    </div>
  </main>;
}
