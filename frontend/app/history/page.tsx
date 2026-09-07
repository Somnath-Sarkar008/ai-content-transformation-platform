"use client";

import { useEffect, useState } from "react";

type HistoryItem = { id: string; createdAt: string; sourcePreview: string; outputs: string[]; content: any };

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem("transformai-history") || "[]")); } catch { setItems([]); }
  }, []);

  function clearHistory() { localStorage.removeItem("transformai-history"); setItems([]); }

  return <main style={{ minHeight: "100vh", padding: 32, background: "#09090b", color: "#fff" }}>
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div><div style={{ color: "#71717a", fontSize: 12, textTransform: "uppercase", letterSpacing: ".12em" }}>TransformAI</div><h1 style={{ margin: "6px 0" }}>Transformation History</h1><p style={{ color: "#a1a1aa", fontSize: 13 }}>Local prototype history — no database required.</p></div>
        <button onClick={clearHistory} disabled={!items.length} style={{ padding: "9px 13px", borderRadius: 9, border: "1px solid #27272a", background: "#111113", color: "#fca5a5" }}>Clear history</button>
      </div>
      {!items.length ? <div style={{ border: "1px solid #27272a", borderRadius: 14, padding: 32, color: "#71717a", background: "#111113" }}>No transformations saved yet. Generate something in the Workspace and it will appear here.</div> : <div style={{ display: "grid", gap: 12 }}>{items.map(item => <article key={item.id} style={{ border: "1px solid #27272a", borderRadius: 14, padding: 18, background: "#111113" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{item.content?.title || "Transformation"}</strong><span style={{ color: "#71717a", fontSize: 11 }}>{new Date(item.createdAt).toLocaleString()}</span></div><p style={{ color: "#a1a1aa", fontSize: 13 }}>{item.sourcePreview}</p><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{item.outputs.map(o => <span key={o} style={{ border: "1px solid #27272a", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#a1a1aa" }}>{o}</span>)}</div></article>)}</div>}
    </div>
  </main>;
}
