// Input dataset types
export interface MemoryDataset {
  id: string;
  conversations: Conversation[];
}

export interface Conversation {
  id: string;
  turns: Turn[];
  facts: Fact[];
}

export interface Turn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface Fact {
  id: string;
  content: string;
  timestamp?: string;
  supersedes?: string;
  category?: 'personal' | 'preference' | 'event' | 'relationship';
}

// Probe types
export type ProbeType = 'recall' | 'hallucination' | 'conflict' | 'temporal';

export interface Probe {
  id: string;
  type: ProbeType;
  question: string;
  context: Turn[];
  expectedAnswer: string;
  relatedFacts: string[];
}

// Result types
export interface ProbeResult {
  probeId: string;
  type: ProbeType;
  question: string;
  expectedAnswer: string;
  actualAnswer: string;
  isCorrect: boolean;
}

export interface AuditMetrics {
  recallAccuracy: number;
  hallucinatedMemoryRate: number;
  conflictResolutionAccuracy: number;
  temporalAccuracy: number;
}

export interface AuditResult {
  datasetId: string;
  timestamp: string;
  metrics: AuditMetrics;
  probeResults: ProbeResult[];
}

// Loader interface for pluggability
export interface DatasetLoader {
  load(path: string): Promise<MemoryDataset>;
  canLoad(path: string): boolean;
}
