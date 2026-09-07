"use client";

import { useCallback, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes: Node[] = [
  { id: "input", position: { x: 40, y: 120 }, data: { label: "📥 Source Input\nText / URL / File" }, type: "input" },
  { id: "analyze", position: { x: 280, y: 120 }, data: { label: "🧠 Analyze Content\nContent Intelligence" } },
  { id: "research", position: { x: 520, y: 40 }, data: { label: "🔎 Research\nTavily" } },
  { id: "orchestrate", position: { x: 520, y: 200 }, data: { label: "🎯 Orchestrator\nGemini" } },
  { id: "outputs", position: { x: 780, y: 120 }, data: { label: "✨ Transform\nMulti-output" } },
  { id: "verify", position: { x: 1020, y: 120 }, data: { label: "🛡️ Quality Guardian\nVerify → Refine" } },
  { id: "export", position: { x: 1260, y: 120 }, data: { label: "📦 Export\nPPTX / PDF / DOCX" }, type: "output" },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "input", target: "analyze", animated: true },
  { id: "e2", source: "analyze", target: "research" },
  { id: "e3", source: "analyze", target: "orchestrate" },
  { id: "e4", source: "research", target: "orchestrate" },
  { id: "e5", source: "orchestrate", target: "outputs", animated: true },
  { id: "e6", source: "outputs", target: "verify", animated: true },
  { id: "e7", source: "verify", target: "export", animated: true },
];

export default function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selected, setSelected] = useState<string | null>(null);

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)), [setEdges]);
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selected), [nodes, selected]);

  return (
    <div className="relative h-[620px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelected(node.id)}
        fitView
        minZoom={0.4}
        maxZoom={1.5}
        defaultEdgeOptions={{ style: { strokeWidth: 2 } }}
      >
        <Background gap={24} size={1} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      {selectedNode && (
        <div className="absolute right-4 top-4 z-10 w-72 rounded-xl border border-white/10 bg-[#11182b]/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-1 text-xs uppercase tracking-wider text-slate-400">Selected node</div>
          <div className="whitespace-pre-line text-sm font-medium text-white">{String(selectedNode.data.label)}</div>
          <div className="mt-4 text-xs leading-5 text-slate-400">Drag nodes, connect handles, and use this workflow as the execution blueprint for the transformation pipeline.</div>
          <button onClick={() => setSelected(null)} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">Close</button>
        </div>
      )}
    </div>
  );
}
