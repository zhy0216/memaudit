# memaudit Design Document

**Date:** 2026-02-14
**Status:** Approved

## Overview

memaudit is an agent memory auditing toolkit. It evaluates how well LLM-based agents recall, handle conflicts, and maintain temporal consistency in conversation memory.

## Approach

**Replay & Query**: Feed conversation context to model, ask auto-generated probes, compare responses to ground truth.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI (memaudit)                       │
├─────────────────────────────────────────────────────────────┤
│  Commands: audit, validate                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Core Engine                             │
├──────────┬───────────┬───────────┬───────────┬──────────────┤
│  Loader  │  Probe    │ Executor  │  Scorer   │  Reporter    │
│          │ Generator │           │           │              │
└──────────┴───────────┴─────┬─────┴───────────┴──────────────┘
                             │
                    ┌────────▼────────┐
                    │   AI Adapter    │
                    │ (Vercel AI SDK) │
                    └─────────────────┘
```

**Data Flow:**
1. Loader reads dataset (JSON/JSONL) → normalized MemoryDataset
2. ProbeGenerator extracts facts → generates recall/conflict/temporal probes
3. Executor sends probes to model via AI Adapter → collects responses
4. Scorer compares responses to ground truth → computes metrics
5. Reporter formats results → outputs markdown + JSON

## Data Model

### Input Dataset

```typescript
interface MemoryDataset {
  id: string;
  conversations: Conversation[];
}

interface Conversation {
  id: string;
  turns: Turn[];
  facts: Fact[];
}

interface Turn {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

interface Fact {
  id: string;
  content: string;
  timestamp?: string;
  supersedes?: string;
  category?: "personal" | "preference" | "event" | "relationship";
}
```

### Probes

```typescript
type ProbeType = "recall" | "hallucination" | "conflict" | "temporal";

interface Probe {
  id: string;
  type: ProbeType;
  question: string;
  context: Turn[];
  expectedAnswer: string;
  relatedFacts: string[];
}
```

### Results

```typescript
interface AuditResult {
  datasetId: string;
  timestamp: string;
  metrics: AuditMetrics;
  probeResults: ProbeResult[];
}

interface AuditMetrics {
  recallAccuracy: number;
  hallucinatedMemoryRate: number;
  conflictResolutionAccuracy: number;
  temporalAccuracy: number;
}
```

## Audit Metrics

### 1. Recall Accuracy
- **What**: Can the model correctly recall facts from conversation history?
- **How**: Generate questions from facts, compare response to expected answer
- **Scoring**: `correct_recalls / total_recall_probes`

### 2. Hallucinated Memory Rate
- **What**: Does the model "remember" things that never happened?
- **How**: Ask about non-existent facts
- **Scoring**: `hallucinated_responses / total_hallucination_probes` (lower = better)

### 3. Conflict Resolution Accuracy
- **What**: When facts contradict, does model use the latest?
- **How**: Use `supersedes` field to identify conflicts, probe for current value
- **Scoring**: `correct_conflict_resolutions / total_conflict_probes`

### 4. Temporal Accuracy
- **What**: Does the model correctly order events in time?
- **How**: Ask "What happened first: X or Y?" using timestamped facts
- **Scoring**: `correct_temporal_orderings / total_temporal_probes`

### Response Matching
AI-assisted semantic matching via the same model, not exact string comparison.

## CLI Interface

```bash
memaudit audit <dataset> [options]
  --model <model>        # Model to test (default: gpt-4o-mini)
  --output <dir>         # Output directory (default: ./audit-results)
  --format <fmt>         # Output format: all|json|markdown

memaudit validate <dataset>
```

### Environment Configuration

```bash
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=...         # Optional: custom endpoint
MEMAUDIT_MODEL=gpt-4o-mini  # Optional: default model
```

## File Structure

```
memaudit/
├── src/
│   ├── cli.ts
│   ├── core/
│   │   ├── loader.ts
│   │   ├── probe-generator.ts
│   │   ├── executor.ts
│   │   ├── scorer.ts
│   │   └── reporter.ts
│   ├── adapters/
│   │   └── openai.ts
│   └── types.ts
├── tests/
│   ├── scorer.test.ts
│   ├── loader.test.ts
│   ├── probe-generator.test.ts
│   └── fixtures/
├── data/
│   └── sample-dataset.json
├── examples/
│   └── run-audit.sh
└── .github/workflows/ci.yml
```

## Test Strategy

**Unit Tests (Vitest):**
- Scorer tests: Core focus - test each metric calculation
- Loader tests: Validate JSON/JSONL parsing
- ProbeGenerator tests: Verify probe generation from facts

**CI (GitHub Actions):**
- Type checking (tsc --noEmit)
- Unit tests (vitest)
- Build CLI

## MVP Scope

**In Scope:**
- CLI with audit and validate commands
- JSON/JSONL loaders
- 4 metrics: recall, hallucination, conflict, temporal
- Auto-probe generation from facts
- AI-assisted response matching via Vercel AI SDK
- Markdown + JSON report output
- Sample dataset with runnable example
- Unit tests for scoring logic
- GitHub Actions CI

**Out of Scope:**
- Database loaders
- Custom probe templates
- Web UI/dashboard
- Historical trend tracking
- Multiple model comparison
