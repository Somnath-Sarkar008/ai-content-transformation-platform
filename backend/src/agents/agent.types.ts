export type AgentName = 'text' | 'image' | 'video' | 'presentation';

export type SourceClaim = {
  id: string;
  text: string;
  source_ids?: string[];
  confidence?: number;
};

export type SourceConflict = {
  id: string;
  topic: string;
  claim_a: { text: string; source_id: string; source_name: string; excerpt: string };
  claim_b: { text: string; source_id: string; source_name: string; excerpt: string };
  severity: 'low' | 'medium' | 'high';
  resolution: 'unresolved' | 'resolved_by_authority' | 'resolved_by_date' | 'needs_review';
  recommendation: string;
};

export type AgentContext = {
  source: string;
  title?: string;
  summary?: string;
  facts?: unknown[];
  entities?: unknown[];
  claims?: SourceClaim[];
  provenance?: Record<string, { source_id: string; source_name: string; excerpt: string }[]>;
  conflicts?: SourceConflict[];
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
