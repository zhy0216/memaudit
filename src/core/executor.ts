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
