export type AgentName = 'text' | 'image' | 'video' | 'presentation';

export type SourceClaim = {
  id: string;
  text: string;
  source_ids?: string[];
  confidence?: number;
};

export type AgentContext = {
  source: string;
  title?: string;
  summary?: string;
  facts?: unknown[];
  entities?: unknown[];
  claims?: SourceClaim[];
  provenance?: Record<string, { source_id: string; source_name: string; excerpt: string }[]>;
  audience?: string;
  tone?: string;
  language?: string;
  detail?: string;
  refinementFeedback?: string[];
};

export type AgentResult = {
  agent: AgentName;
  outputs: Record<string, unknown>;
  notes?: string[];
};
