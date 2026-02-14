#!/usr/bin/env node
/**
 * Fetch and prepare MemoryBench dataset for memaudit
 *
 * Usage: node scripts/fetch-memorybench.js [--samples N]
 *
 * This script:
 * 1. Downloads Locomo-0 test split from THUIR/MemoryBench on Hugging Face
 * 2. Transforms it to memaudit format
 * 3. Saves to data/real/memorybench-locomo.json
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const RAW_DIR = join(PROJECT_ROOT, 'data', 'real', 'raw');
const OUTPUT_DIR = join(PROJECT_ROOT, 'data', 'real');
const ARROW_FILE = join(RAW_DIR, 'locomo-0-test.arrow');
const OUTPUT_FILE = join(OUTPUT_DIR, 'memorybench-locomo.json');

const HF_URL = 'https://huggingface.co/datasets/THUIR/MemoryBench/resolve/main/dataset/Locomo-0/test/data-00000-of-00001.arrow';

// Parse args
const args = process.argv.slice(2);
let maxSamples = 5; // Default: 5 samples for manageable size
const samplesIdx = args.indexOf('--samples');
if (samplesIdx !== -1 && args[samplesIdx + 1]) {
  maxSamples = parseInt(args[samplesIdx + 1], 10);
}

async function main() {
  console.log('MemoryBench Dataset Preparation');
  console.log('================================\n');

  // Create directories
  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Download if not exists
  if (!existsSync(ARROW_FILE)) {
    console.log(`Downloading Locomo-0 test split from Hugging Face...`);
    console.log(`URL: ${HF_URL}\n`);

    try {
      execSync(`curl -sL "${HF_URL}" -o "${ARROW_FILE}"`, { stdio: 'inherit' });
      console.log('Download complete.\n');
    } catch (error) {
      console.error('Failed to download dataset:', error);
      process.exit(1);
    }
  } else {
    console.log('Arrow file already exists, skipping download.\n');
  }

  // Transform using the adapter
  console.log(`Transforming to memaudit format (max ${maxSamples} samples)...`);

  // Dynamic import of the adapter
  const { transformMemoryBenchToJson } = await import('../dist/adapters/memorybench.js');
  const dataset = transformMemoryBenchToJson(ARROW_FILE, OUTPUT_FILE, maxSamples);

  console.log(`\nTransformation complete!`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`Conversations: ${dataset.conversations.length}`);

  // Create provenance file
  const provenance = {
    source: 'THUIR/MemoryBench',
    subset: 'Locomo-0',
    split: 'test',
    huggingface_url: 'https://huggingface.co/datasets/THUIR/MemoryBench',
    paper: 'https://arxiv.org/abs/2510.17281',
    license: 'MIT',
    fetched_at: new Date().toISOString(),
    samples: dataset.conversations.length,
    original_total: 5,
    citation: `@article{ai2025memorybench,
  title={MemoryBench: A Benchmark for Memory and Continual Learning in LLM Systems},
  author={Ai, Qingyao and Tang, Yichen and Wang, Changyue and Long, Jianming and Su, Weihang and Liu, Yiqun},
  journal={arXiv preprint arXiv:2510.17281},
  year={2025}
}`,
  };

  writeFileSync(
    join(OUTPUT_DIR, 'PROVENANCE.json'),
    JSON.stringify(provenance, null, 2)
  );

  console.log(`Provenance: ${join(OUTPUT_DIR, 'PROVENANCE.json')}`);
  console.log('\nDone!');
}

main().catch(console.error);
