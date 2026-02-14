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
