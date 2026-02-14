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
