import { describe, it, expect, beforeAll } from 'vitest';
import { loadMemoryBenchArrow } from '../src/adapters/memorybench';
import { existsSync } from 'fs';
import path from 'path';

const ARROW_FILE = path.join(__dirname, '../data/real/raw/locomo-0-test.arrow');

describe('MemoryBench Adapter', () => {
  const hasArrowFile = existsSync(ARROW_FILE);

  it.skipIf(!hasArrowFile)('loads MemoryBench arrow file', () => {
    const dataset = loadMemoryBenchArrow(ARROW_FILE);
    expect(dataset.id).toContain('memorybench');
    expect(dataset.conversations.length).toBeGreaterThan(0);
  });

  it.skipIf(!hasArrowFile)('transforms rows to valid conversations', () => {
    const dataset = loadMemoryBenchArrow(ARROW_FILE);
    const conv = dataset.conversations[0];

    expect(conv.id).toBeDefined();
    expect(conv.turns).toBeDefined();
    expect(conv.facts).toBeDefined();
    expect(Array.isArray(conv.turns)).toBe(true);
    expect(Array.isArray(conv.facts)).toBe(true);
  });

  it.skipIf(!hasArrowFile)('extracts facts from evidence', () => {
    const dataset = loadMemoryBenchArrow(ARROW_FILE);
    const conv = dataset.conversations[0];

    // Should have at least the golden answer fact
    expect(conv.facts.length).toBeGreaterThan(0);

    // Check fact structure
    const fact = conv.facts[0];
    expect(fact.id).toBeDefined();
    expect(fact.content).toBeDefined();
    expect(typeof fact.content).toBe('string');
  });

  it.skipIf(!hasArrowFile)('includes question in turns', () => {
    const dataset = loadMemoryBenchArrow(ARROW_FILE);
    const conv = dataset.conversations[0];

    // Should have a system turn with the question
    const systemTurn = conv.turns.find(t => t.role === 'system');
    expect(systemTurn).toBeDefined();
    expect(systemTurn?.content).toContain('Question:');
  });

  it.skipIf(!hasArrowFile)('handles dialog parsing', () => {
    const dataset = loadMemoryBenchArrow(ARROW_FILE);
    const conv = dataset.conversations[0];

    // Should have user/assistant turns
    const userTurns = conv.turns.filter(t => t.role === 'user');
    expect(userTurns.length).toBeGreaterThan(0);
  });
});
