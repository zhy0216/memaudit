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
