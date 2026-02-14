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
