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
