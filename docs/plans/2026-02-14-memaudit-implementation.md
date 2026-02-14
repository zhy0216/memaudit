# memaudit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a CLI toolkit that audits agent memory by running probes and computing recall, hallucination, conflict, and temporal accuracy metrics.

**Architecture:** Modular pipeline with Loader → ProbeGenerator → Executor → Scorer → Reporter. AI calls via Vercel AI SDK with OpenAI-compatible adapter.

**Tech Stack:** TypeScript, Vercel AI SDK (`ai`), Commander.js (CLI), Vitest (testing), tsup (bundling)

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

**Step 1: Initialize package.json**

```json
{
  "name": "memaudit",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "memaudit": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsup src/cli.ts --format esm --dts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "ai": "^3.0.0",
    "@ai-sdk/openai": "^0.0.40",
    "commander": "^12.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
.env
audit-results/
*.log
```

**Step 5: Install dependencies**

Run: `npm install`
Expected: Clean install with no errors

**Step 6: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: initialize project with TypeScript, Vitest, AI SDK"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `src/types.ts`

**Step 1: Create complete type definitions**

```typescript
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
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add core type definitions"
```

---

## Task 3: Dataset Loader with Tests

**Files:**
- Create: `src/core/loader.ts`
- Create: `tests/loader.test.ts`
- Create: `tests/fixtures/sample-dataset.json`

**Step 1: Create test fixture**

```json
{
  "id": "test-dataset-1",
  "conversations": [
    {
      "id": "conv-1",
      "turns": [
        { "role": "user", "content": "My name is Alice" },
        { "role": "assistant", "content": "Nice to meet you, Alice!" },
        { "role": "user", "content": "I live in Seattle", "timestamp": "2024-01-01T10:00:00Z" },
        { "role": "assistant", "content": "Seattle is a great city!" }
      ],
      "facts": [
        { "id": "fact-1", "content": "User's name is Alice", "category": "personal" },
        { "id": "fact-2", "content": "User lives in Seattle", "timestamp": "2024-01-01T10:00:00Z", "category": "personal" }
      ]
    },
    {
      "id": "conv-2",
      "turns": [
        { "role": "user", "content": "Actually, I moved to Portland", "timestamp": "2024-02-01T10:00:00Z" },
        { "role": "assistant", "content": "Portland is lovely too!" }
      ],
      "facts": [
        { "id": "fact-3", "content": "User lives in Portland", "timestamp": "2024-02-01T10:00:00Z", "supersedes": "fact-2", "category": "personal" }
      ]
    }
  ]
}
```

**Step 2: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { JsonLoader, loadDataset } from '../src/core/loader';
import path from 'path';

describe('JsonLoader', () => {
  const loader = new JsonLoader();
  const fixturePath = path.join(__dirname, 'fixtures/sample-dataset.json');

  it('canLoad returns true for .json files', () => {
    expect(loader.canLoad('test.json')).toBe(true);
    expect(loader.canLoad('test.jsonl')).toBe(false);
  });

  it('loads and parses JSON dataset', async () => {
    const dataset = await loader.load(fixturePath);
    expect(dataset.id).toBe('test-dataset-1');
    expect(dataset.conversations).toHaveLength(2);
  });

  it('throws on invalid file', async () => {
    await expect(loader.load('nonexistent.json')).rejects.toThrow();
  });
});

describe('loadDataset', () => {
  it('auto-selects loader based on extension', async () => {
    const fixturePath = path.join(__dirname, 'fixtures/sample-dataset.json');
    const dataset = await loadDataset(fixturePath);
    expect(dataset.id).toBe('test-dataset-1');
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - module not found

**Step 4: Implement loader**

```typescript
import { readFile } from 'fs/promises';
import type { DatasetLoader, MemoryDataset } from '../types';

export class JsonLoader implements DatasetLoader {
  canLoad(path: string): boolean {
    return path.endsWith('.json');
  }

  async load(filePath: string): Promise<MemoryDataset> {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as MemoryDataset;
  }
}

export class JsonlLoader implements DatasetLoader {
  canLoad(path: string): boolean {
    return path.endsWith('.jsonl');
  }

  async load(filePath: string): Promise<MemoryDataset> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const conversations = lines.map(line => JSON.parse(line));
    return {
      id: filePath,
      conversations,
    };
  }
}

const loaders: DatasetLoader[] = [new JsonLoader(), new JsonlLoader()];

export async function loadDataset(filePath: string): Promise<MemoryDataset> {
  const loader = loaders.find(l => l.canLoad(filePath));
  if (!loader) {
    throw new Error(`No loader found for file: ${filePath}`);
  }
  return loader.load(filePath);
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/core/loader.ts tests/loader.test.ts tests/fixtures/sample-dataset.json
git commit -m "feat: add JSON/JSONL dataset loaders with tests"
```

---

## Task 4: Probe Generator with Tests

**Files:**
- Create: `src/core/probe-generator.ts`
- Create: `tests/probe-generator.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { generateProbes } from '../src/core/probe-generator';
import type { MemoryDataset } from '../src/types';

const testDataset: MemoryDataset = {
  id: 'test',
  conversations: [
    {
      id: 'conv-1',
      turns: [
        { role: 'user', content: 'My name is Alice' },
        { role: 'assistant', content: 'Hello Alice!' },
      ],
      facts: [
        { id: 'fact-1', content: "User's name is Alice", category: 'personal' },
      ],
    },
    {
      id: 'conv-2',
      turns: [
        { role: 'user', content: 'I moved from Seattle to Portland', timestamp: '2024-02-01T10:00:00Z' },
      ],
      facts: [
        { id: 'fact-2', content: 'User lived in Seattle', timestamp: '2024-01-01T10:00:00Z' },
        { id: 'fact-3', content: 'User lives in Portland', timestamp: '2024-02-01T10:00:00Z', supersedes: 'fact-2' },
      ],
    },
  ],
};

describe('generateProbes', () => {
  it('generates recall probes for facts', () => {
    const probes = generateProbes(testDataset);
    const recallProbes = probes.filter(p => p.type === 'recall');
    expect(recallProbes.length).toBeGreaterThan(0);
    expect(recallProbes[0].expectedAnswer).toBeDefined();
  });

  it('generates conflict probes for superseded facts', () => {
    const probes = generateProbes(testDataset);
    const conflictProbes = probes.filter(p => p.type === 'conflict');
    expect(conflictProbes.length).toBeGreaterThan(0);
  });

  it('generates temporal probes for timestamped facts', () => {
    const probes = generateProbes(testDataset);
    const temporalProbes = probes.filter(p => p.type === 'temporal');
    expect(temporalProbes.length).toBeGreaterThan(0);
  });

  it('generates hallucination probes', () => {
    const probes = generateProbes(testDataset);
    const hallucinationProbes = probes.filter(p => p.type === 'hallucination');
    expect(hallucinationProbes.length).toBeGreaterThan(0);
  });

  it('includes conversation context in probes', () => {
    const probes = generateProbes(testDataset);
    expect(probes[0].context.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - module not found

**Step 3: Implement probe generator**

```typescript
import type { MemoryDataset, Probe, Fact, Turn } from '../types';

let probeCounter = 0;

function generateProbeId(): string {
  return `probe-${++probeCounter}`;
}

function getAllTurns(dataset: MemoryDataset): Turn[] {
  return dataset.conversations.flatMap(c => c.turns);
}

function getAllFacts(dataset: MemoryDataset): Fact[] {
  return dataset.conversations.flatMap(c => c.facts);
}

function generateRecallProbes(dataset: MemoryDataset): Probe[] {
  const facts = getAllFacts(dataset);
  const context = getAllTurns(dataset);

  return facts
    .filter(f => !f.supersedes) // Don't test superseded facts
    .map(fact => ({
      id: generateProbeId(),
      type: 'recall' as const,
      question: `Based on the conversation history, ${fact.content.toLowerCase().replace("user's ", "what is the user's ").replace("user ", "what did the user ")}?`,
      context,
      expectedAnswer: fact.content,
      relatedFacts: [fact.id],
    }));
}

function generateConflictProbes(dataset: MemoryDataset): Probe[] {
  const facts = getAllFacts(dataset);
  const context = getAllTurns(dataset);

  const supersedingFacts = facts.filter(f => f.supersedes);
  return supersedingFacts.map(fact => {
    const oldFact = facts.find(f => f.id === fact.supersedes);
    return {
      id: generateProbeId(),
      type: 'conflict' as const,
      question: `The user previously mentioned "${oldFact?.content}" but later said "${fact.content}". What is the current correct information?`,
      context,
      expectedAnswer: fact.content,
      relatedFacts: [fact.id, fact.supersedes!],
    };
  });
}

function generateTemporalProbes(dataset: MemoryDataset): Probe[] {
  const facts = getAllFacts(dataset).filter(f => f.timestamp);
  const context = getAllTurns(dataset);

  if (facts.length < 2) return [];

  const probes: Probe[] = [];
  for (let i = 0; i < facts.length - 1; i++) {
    const earlier = facts[i];
    const later = facts[i + 1];
    if (new Date(earlier.timestamp!) < new Date(later.timestamp!)) {
      probes.push({
        id: generateProbeId(),
        type: 'temporal' as const,
        question: `Which happened first: "${earlier.content}" or "${later.content}"?`,
        context,
        expectedAnswer: earlier.content,
        relatedFacts: [earlier.id, later.id],
      });
    }
  }
  return probes;
}

function generateHallucinationProbes(dataset: MemoryDataset): Probe[] {
  const context = getAllTurns(dataset);

  // Generate probes about things NOT mentioned
  const fakeTopics = [
    { topic: 'pet', question: "What is the user's pet's name?" },
    { topic: 'job', question: "What is the user's job title?" },
    { topic: 'hobby', question: "What is the user's favorite hobby?" },
  ];

  return fakeTopics.map(({ question }) => ({
    id: generateProbeId(),
    type: 'hallucination' as const,
    question: `Based ONLY on the conversation history, ${question} If this was never mentioned, say "Not mentioned".`,
    context,
    expectedAnswer: 'Not mentioned',
    relatedFacts: [],
  }));
}

export function generateProbes(dataset: MemoryDataset): Probe[] {
  probeCounter = 0; // Reset for deterministic IDs
  return [
    ...generateRecallProbes(dataset),
    ...generateConflictProbes(dataset),
    ...generateTemporalProbes(dataset),
    ...generateHallucinationProbes(dataset),
  ];
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/core/probe-generator.ts tests/probe-generator.test.ts
git commit -m "feat: add probe generator with recall, conflict, temporal, hallucination probes"
```

---

## Task 5: Scorer with Tests

**Files:**
- Create: `src/core/scorer.ts`
- Create: `tests/scorer.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { computeMetrics } from '../src/core/scorer';
import type { ProbeResult } from '../src/types';

describe('computeMetrics', () => {
  it('computes recall accuracy correctly', () => {
    const results: ProbeResult[] = [
      { probeId: '1', type: 'recall', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: true },
      { probeId: '2', type: 'recall', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: true },
      { probeId: '3', type: 'recall', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: false },
    ];
    const metrics = computeMetrics(results);
    expect(metrics.recallAccuracy).toBeCloseTo(0.667, 2);
  });

  it('computes hallucination rate correctly', () => {
    const results: ProbeResult[] = [
      { probeId: '1', type: 'hallucination', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: true },
      { probeId: '2', type: 'hallucination', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: false },
    ];
    const metrics = computeMetrics(results);
    // Hallucination rate = incorrect / total (lower is better)
    expect(metrics.hallucinatedMemoryRate).toBeCloseTo(0.5, 2);
  });

  it('computes conflict resolution accuracy correctly', () => {
    const results: ProbeResult[] = [
      { probeId: '1', type: 'conflict', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: true },
      { probeId: '2', type: 'conflict', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: true },
    ];
    const metrics = computeMetrics(results);
    expect(metrics.conflictResolutionAccuracy).toBe(1.0);
  });

  it('computes temporal accuracy correctly', () => {
    const results: ProbeResult[] = [
      { probeId: '1', type: 'temporal', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: false },
      { probeId: '2', type: 'temporal', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: false },
    ];
    const metrics = computeMetrics(results);
    expect(metrics.temporalAccuracy).toBe(0);
  });

  it('returns 0 for metrics with no probes of that type', () => {
    const results: ProbeResult[] = [
      { probeId: '1', type: 'recall', question: '', expectedAnswer: '', actualAnswer: '', isCorrect: true },
    ];
    const metrics = computeMetrics(results);
    expect(metrics.conflictResolutionAccuracy).toBe(0);
    expect(metrics.temporalAccuracy).toBe(0);
    expect(metrics.hallucinatedMemoryRate).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - module not found

**Step 3: Implement scorer**

```typescript
import type { ProbeResult, AuditMetrics, ProbeType } from '../types';

function computeAccuracy(results: ProbeResult[], type: ProbeType): number {
  const typeResults = results.filter(r => r.type === type);
  if (typeResults.length === 0) return 0;
  const correct = typeResults.filter(r => r.isCorrect).length;
  return correct / typeResults.length;
}

function computeHallucinationRate(results: ProbeResult[]): number {
  const hallucinationResults = results.filter(r => r.type === 'hallucination');
  if (hallucinationResults.length === 0) return 0;
  // Rate of hallucinations = incorrect responses (model made things up)
  const hallucinated = hallucinationResults.filter(r => !r.isCorrect).length;
  return hallucinated / hallucinationResults.length;
}

export function computeMetrics(results: ProbeResult[]): AuditMetrics {
  return {
    recallAccuracy: computeAccuracy(results, 'recall'),
    hallucinatedMemoryRate: computeHallucinationRate(results),
    conflictResolutionAccuracy: computeAccuracy(results, 'conflict'),
    temporalAccuracy: computeAccuracy(results, 'temporal'),
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/core/scorer.ts tests/scorer.test.ts
git commit -m "feat: add scorer with metric computation and tests"
```

---

## Task 6: OpenAI Adapter with AI SDK

**Files:**
- Create: `src/adapters/openai.ts`

**Step 1: Implement OpenAI adapter**

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { Probe, Turn } from '../types';

export interface AIAdapter {
  executeProbe(probe: Probe): Promise<string>;
  checkMatch(expected: string, actual: string): Promise<boolean>;
}

export function createOpenAIAdapter(model?: string): AIAdapter {
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const modelId = model || process.env.MEMAUDIT_MODEL || 'gpt-4o-mini';

  function formatContext(turns: Turn[]): string {
    return turns
      .map(t => `${t.role.toUpperCase()}: ${t.content}`)
      .join('\n');
  }

  return {
    async executeProbe(probe: Probe): Promise<string> {
      const systemPrompt = `You are being tested on your memory recall. Answer questions based ONLY on the conversation history provided. Be concise and direct.`;

      const { text } = await generateText({
        model: openai(modelId),
        system: systemPrompt,
        prompt: `CONVERSATION HISTORY:\n${formatContext(probe.context)}\n\nQUESTION: ${probe.question}`,
      });

      return text.trim();
    },

    async checkMatch(expected: string, actual: string): Promise<boolean> {
      // Simple semantic matching via model
      const { text } = await generateText({
        model: openai(modelId),
        prompt: `Do these two statements mean the same thing? Answer only "yes" or "no".

Statement 1: "${expected}"
Statement 2: "${actual}"`,
      });

      return text.toLowerCase().includes('yes');
    },
  };
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/adapters/openai.ts
git commit -m "feat: add OpenAI adapter using Vercel AI SDK"
```

---

## Task 7: Executor

**Files:**
- Create: `src/core/executor.ts`

**Step 1: Implement executor**

```typescript
import type { Probe, ProbeResult } from '../types';
import type { AIAdapter } from '../adapters/openai';

export async function executeProbes(
  probes: Probe[],
  adapter: AIAdapter,
  onProgress?: (completed: number, total: number) => void
): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];

  for (let i = 0; i < probes.length; i++) {
    const probe = probes[i];
    const actualAnswer = await adapter.executeProbe(probe);
    const isCorrect = await adapter.checkMatch(probe.expectedAnswer, actualAnswer);

    results.push({
      probeId: probe.id,
      type: probe.type,
      question: probe.question,
      expectedAnswer: probe.expectedAnswer,
      actualAnswer,
      isCorrect,
    });

    onProgress?.(i + 1, probes.length);
  }

  return results;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/core/executor.ts
git commit -m "feat: add probe executor"
```

---

## Task 8: Reporter

**Files:**
- Create: `src/core/reporter.ts`

**Step 1: Implement reporter**

```typescript
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { AuditResult } from '../types';

export async function generateReports(
  result: AuditResult,
  outputDir: string,
  format: 'all' | 'json' | 'markdown' = 'all'
): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  if (format === 'all' || format === 'json') {
    await writeFile(
      join(outputDir, 'results.json'),
      JSON.stringify(result, null, 2)
    );
  }

  if (format === 'all' || format === 'markdown') {
    const markdown = generateMarkdownReport(result);
    await writeFile(join(outputDir, 'report.md'), markdown);
  }
}

function generateMarkdownReport(result: AuditResult): string {
  const { metrics, probeResults } = result;

  const lines = [
    '# Memory Audit Report',
    '',
    `**Dataset:** ${result.datasetId}`,
    `**Timestamp:** ${result.timestamp}`,
    '',
    '## Metrics Summary',
    '',
    '| Metric | Score |',
    '|--------|-------|',
    `| Recall Accuracy | ${(metrics.recallAccuracy * 100).toFixed(1)}% |`,
    `| Hallucinated Memory Rate | ${(metrics.hallucinatedMemoryRate * 100).toFixed(1)}% |`,
    `| Conflict Resolution Accuracy | ${(metrics.conflictResolutionAccuracy * 100).toFixed(1)}% |`,
    `| Temporal Accuracy | ${(metrics.temporalAccuracy * 100).toFixed(1)}% |`,
    '',
    '## Probe Results',
    '',
  ];

  const byType = {
    recall: probeResults.filter(r => r.type === 'recall'),
    hallucination: probeResults.filter(r => r.type === 'hallucination'),
    conflict: probeResults.filter(r => r.type === 'conflict'),
    temporal: probeResults.filter(r => r.type === 'temporal'),
  };

  for (const [type, results] of Object.entries(byType)) {
    if (results.length === 0) continue;
    lines.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)} Probes`);
    lines.push('');
    for (const r of results) {
      const status = r.isCorrect ? '✓' : '✗';
      lines.push(`- ${status} **Q:** ${r.question}`);
      lines.push(`  - Expected: ${r.expectedAnswer}`);
      lines.push(`  - Actual: ${r.actualAnswer}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/core/reporter.ts
git commit -m "feat: add markdown and JSON report generator"
```

---

## Task 9: CLI

**Files:**
- Create: `src/cli.ts`

**Step 1: Implement CLI**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { loadDataset } from './core/loader';
import { generateProbes } from './core/probe-generator';
import { executeProbes } from './core/executor';
import { computeMetrics } from './core/scorer';
import { generateReports } from './core/reporter';
import { createOpenAIAdapter } from './adapters/openai';

const program = new Command();

program
  .name('memaudit')
  .description('Agent memory auditing toolkit')
  .version('0.1.0');

program
  .command('audit')
  .description('Run memory audit on a dataset')
  .argument('<dataset>', 'Path to dataset file (JSON or JSONL)')
  .option('-m, --model <model>', 'Model to use for testing')
  .option('-o, --output <dir>', 'Output directory', './audit-results')
  .option('-f, --format <format>', 'Output format: all|json|markdown', 'all')
  .action(async (datasetPath, options) => {
    try {
      console.log(`Loading dataset: ${datasetPath}`);
      const dataset = await loadDataset(datasetPath);

      console.log(`Generating probes...`);
      const probes = generateProbes(dataset);
      console.log(`Generated ${probes.length} probes`);

      console.log(`Executing probes...`);
      const adapter = createOpenAIAdapter(options.model);
      const probeResults = await executeProbes(probes, adapter, (done, total) => {
        process.stdout.write(`\rProgress: ${done}/${total}`);
      });
      console.log('');

      console.log(`Computing metrics...`);
      const metrics = computeMetrics(probeResults);

      const result = {
        datasetId: dataset.id,
        timestamp: new Date().toISOString(),
        metrics,
        probeResults,
      };

      console.log(`Generating reports...`);
      await generateReports(result, options.output, options.format);

      console.log(`\nAudit complete!`);
      console.log(`Results written to: ${options.output}`);
      console.log(`\nMetrics:`);
      console.log(`  Recall Accuracy: ${(metrics.recallAccuracy * 100).toFixed(1)}%`);
      console.log(`  Hallucinated Memory Rate: ${(metrics.hallucinatedMemoryRate * 100).toFixed(1)}%`);
      console.log(`  Conflict Resolution: ${(metrics.conflictResolutionAccuracy * 100).toFixed(1)}%`);
      console.log(`  Temporal Accuracy: ${(metrics.temporalAccuracy * 100).toFixed(1)}%`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate dataset format without running audit')
  .argument('<dataset>', 'Path to dataset file')
  .action(async (datasetPath) => {
    try {
      const dataset = await loadDataset(datasetPath);
      console.log(`✓ Valid dataset: ${dataset.id}`);
      console.log(`  Conversations: ${dataset.conversations.length}`);
      const totalFacts = dataset.conversations.reduce((sum, c) => sum + c.facts.length, 0);
      const totalTurns = dataset.conversations.reduce((sum, c) => sum + c.turns.length, 0);
      console.log(`  Total turns: ${totalTurns}`);
      console.log(`  Total facts: ${totalFacts}`);
    } catch (error) {
      console.error('✗ Invalid dataset:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
```

**Step 2: Build CLI**

Run: `npm run build`
Expected: Clean build, creates dist/cli.js

**Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI with audit and validate commands"
```

---

## Task 10: Sample Dataset and Example

**Files:**
- Create: `data/sample-dataset.json`
- Create: `examples/run-audit.sh`

**Step 1: Create comprehensive sample dataset**

```json
{
  "id": "sample-memory-audit",
  "conversations": [
    {
      "id": "conv-intro",
      "turns": [
        { "role": "user", "content": "Hi! My name is Sarah and I'm a software engineer.", "timestamp": "2024-01-15T09:00:00Z" },
        { "role": "assistant", "content": "Hello Sarah! It's great to meet a fellow software engineer. What technologies do you work with?" },
        { "role": "user", "content": "I mainly work with Python and TypeScript. I also have a dog named Max.", "timestamp": "2024-01-15T09:01:00Z" },
        { "role": "assistant", "content": "Python and TypeScript are a great combination! And Max sounds like a lovely companion." }
      ],
      "facts": [
        { "id": "fact-1", "content": "User's name is Sarah", "category": "personal", "timestamp": "2024-01-15T09:00:00Z" },
        { "id": "fact-2", "content": "User is a software engineer", "category": "personal", "timestamp": "2024-01-15T09:00:00Z" },
        { "id": "fact-3", "content": "User works with Python and TypeScript", "category": "preference", "timestamp": "2024-01-15T09:01:00Z" },
        { "id": "fact-4", "content": "User has a dog named Max", "category": "personal", "timestamp": "2024-01-15T09:01:00Z" }
      ]
    },
    {
      "id": "conv-update",
      "turns": [
        { "role": "user", "content": "Actually, I've switched to mainly using Rust now instead of Python.", "timestamp": "2024-03-01T10:00:00Z" },
        { "role": "assistant", "content": "That's interesting! Rust is known for its performance and safety. What prompted the switch?" },
        { "role": "user", "content": "I joined a new team that focuses on systems programming.", "timestamp": "2024-03-01T10:01:00Z" }
      ],
      "facts": [
        { "id": "fact-5", "content": "User now mainly uses Rust instead of Python", "category": "preference", "timestamp": "2024-03-01T10:00:00Z", "supersedes": "fact-3" },
        { "id": "fact-6", "content": "User joined a new team doing systems programming", "category": "event", "timestamp": "2024-03-01T10:01:00Z" }
      ]
    }
  ]
}
```

**Step 2: Create example script**

```bash
#!/bin/bash
# Run memaudit example

set -e

# Check for API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable is not set"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Build if needed
if [ ! -f "$PROJECT_DIR/dist/cli.js" ]; then
    echo "Building memaudit..."
    cd "$PROJECT_DIR" && npm run build
fi

# Run audit
echo "Running memory audit..."
node "$PROJECT_DIR/dist/cli.js" audit "$PROJECT_DIR/data/sample-dataset.json" --output "$PROJECT_DIR/audit-results"

echo ""
echo "Done! Check audit-results/report.md for the full report."
```

**Step 3: Make script executable**

Run: `chmod +x examples/run-audit.sh`

**Step 4: Commit**

```bash
git add data/sample-dataset.json examples/run-audit.sh
git commit -m "feat: add sample dataset and runnable example"
```

---

## Task 11: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create CI workflow**

```yaml
name: CI

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Validate sample dataset
        run: node dist/cli.js validate data/sample-dataset.json
```

**Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for testing and building"
```

---

## Task 12: Final Verification

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Type check**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Build**

Run: `npm run build`
Expected: Clean build

**Step 4: Validate sample dataset**

Run: `node dist/cli.js validate data/sample-dataset.json`
Expected: Valid dataset output

**Step 5: Final commit if any fixes needed**

```bash
git status
# If clean, no commit needed
```

---

## Task 13: Push to Remote

**Step 1: Push all commits**

Run: `git push -u origin master`
Expected: Successfully pushed to origin

---

## Execution Checklist

- [ ] Task 1: Project setup
- [ ] Task 2: Type definitions
- [ ] Task 3: Loader with tests
- [ ] Task 4: Probe generator with tests
- [ ] Task 5: Scorer with tests
- [ ] Task 6: OpenAI adapter
- [ ] Task 7: Executor
- [ ] Task 8: Reporter
- [ ] Task 9: CLI
- [ ] Task 10: Sample dataset and example
- [ ] Task 11: GitHub Actions CI
- [ ] Task 12: Final verification
- [ ] Task 13: Push to remote
