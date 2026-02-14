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
