"use client";

import { useCallback, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type NodeConfig = { enabled?: boolean; research?: boolean; model?: string; tone?: string; audience?: string; detail?: string };

const initialNodes: Node[] = [
  { id: "input", position: { x: 40, y: 120 }, data: { label: "📥 Source Input\nText / URL / File", config: { enabled: true } }, type: "input" },
  { id: "analyze", position: { x: 280, y: 120 }, data: { label: "🧠 Analyze Content\nContent Intelligence", config: { enabled: true } } },
  { id: "research", position: { x: 520, y: 40 }, data: { label: "🔎 Research\nTavily", config: { enabled: true, research: true } } },
  { id: "orchestrate", position: { x: 520, y: 200 }, data: { label: "🎯 Orchestrator\nGemini", config: { enabled: true, model: "gemini-2.5-flash-lite" } } },
  { id: "outputs", position: { x: 780, y: 120 }, data: { label: "✨ Transform\nMulti-output", config: { enabled: true, tone: "Professional", audience: "General audience", detail: "Balanced" } } },
  { id: "verify", position: { x: 1020, y: 120 }, data: { label: "🛡️ Quality Guardian\nVerify → Refine", config: { enabled: true } } },
  { id: "export", position: { x: 1260, y: 120 }, data: { label: "📦 Export\nPPTX / PDF / DOCX", config: { enabled: true } }, type: "output" },
];
const initialEdges: Edge[] = [
  { id: "e1", source: "input", target: "analyze", animated: true }, { id: "e2", source: "analyze", target: "research" }, { id: "e3", source: "analyze", target: "orchestrate" },
  { id: "e4", source: "research", target: "orchestrate" }, { id: "e5", source: "orchestrate", target: "outputs", animated: true }, { id: "e6", source: "outputs", target: "verify", animated: true }, { id: "e7", source: "verify", target: "export", animated: true },
];

export default function WorkflowCanvas({ onConfigChange }: { onConfigChange?: (config: Record<string, NodeConfig>) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes); const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges); const [selected, setSelected] = useState<string | null>(null);
  const selectedNode = useMemo(() => nodes.find(n => n.id === selected), [nodes, selected]);
  const onConnect = useCallback((connection: Connection) => setEdges(eds => addEdge({ ...connection, animated: true }, eds)), [setEdges]);
  function updateConfig(patch: NodeConfig) {
    if (!selected) return;
    setNodes(ns => ns.map(n => n.id === selected ? { ...n, data: { ...n.data, config: { ...(n.data.config as NodeConfig), ...patch } } } : n));
    const next = Object.fromEntries(nodes.map(n => [n.id, n.id === selected ? { ...(n.data.config as NodeConfig), ...patch } : (n.data.config as NodeConfig)])); onConfigChange?.(next);
  }
  return <div className="relative h-[620px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]">
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, n) => setSelected(n.id)} fitView minZoom={0.4} maxZoom={1.5} defaultEdgeOptions={{ style: { strokeWidth: 2 } }}>
      <Background gap={24} size={1} /><Controls /><MiniMap pannable zoomable />
    </ReactFlow>
    {selectedNode && <div className="absolute right-4 top-4 z-10 w-80 rounded-xl border border-white/10 bg-[#11182b]/95 p-4 shadow-2xl backdrop-blur">
      <div className="mb-1 text-xs uppercase tracking-wider text-slate-400">Node configuration</div><div className="whitespace-pre-line text-sm font-medium text-white">{String(selectedNode.data.label)}</div>
      <label className="mt-4 flex items-center justify-between text-xs text-slate-300">Enabled <input type="checkbox" checked={(selectedNode.data.config as NodeConfig)?.enabled !== false} onChange={e => updateConfig({ enabled: e.target.checked })} /></label>
      {selected === "research" && <label className="mt-3 block text-xs text-slate-300">Use Tavily research <input className="ml-2" type="checkbox" checked={(selectedNode.data.config as NodeConfig)?.research !== false} onChange={e => updateConfig({ research: e.target.checked })} /></label>}
      {selected === "orchestrate" && <select className="mt-3 w-full rounded-lg bg-[#09090b] p-2 text-xs text-white" value={(selectedNode.data.config as NodeConfig)?.model || "gemini-2.5-flash-lite"} onChange={e => updateConfig({ model: e.target.value })}><option>gemini-2.5-flash-lite</option><option>gemini-2.5-flash</option></select>}
      {selected === "outputs" && <div className="mt-3 space-y-2"><select className="w-full rounded-lg bg-[#09090b] p-2 text-xs text-white" value={(selectedNode.data.config as NodeConfig)?.audience || "General audience"} onChange={e => updateConfig({ audience: e.target.value })}><option>General audience</option><option>Executive / leadership</option><option>Technical</option><option>Public / social</option></select><select className="w-full rounded-lg bg-[#09090b] p-2 text-xs text-white" value={(selectedNode.data.config as NodeConfig)?.tone || "Professional"} onChange={e => updateConfig({ tone: e.target.value })}><option>Professional</option><option>Concise</option><option>Formal</option><option>Engaging</option></select></div>}
      <p className="mt-3 text-xs leading-5 text-slate-500">Drag nodes and connect handles to customize the execution blueprint.</p><button onClick={() => setSelected(null)} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300">Close</button>
    </div>}
  </div>;
}
