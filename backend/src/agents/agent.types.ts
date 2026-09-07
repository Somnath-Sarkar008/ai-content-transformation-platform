export type AgentName = 'text' | 'image' | 'video' | 'presentation';

export type AgentContext = {
  source: string;
  title?: string;
  summary?: string;
  facts?: unknown[];
  entities?: unknown[];
  audience?: string;
  tone?: string;
  language?: string;
  detail?: string;
};

export type AgentResult = {
  agent: AgentName;
  outputs: Record<string, unknown>;
  notes?: string[];
};
