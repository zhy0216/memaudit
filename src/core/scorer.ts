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
