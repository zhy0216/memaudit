import { tableFromIPC } from 'apache-arrow';
import { readFileSync, writeFileSync } from 'fs';
import type { MemoryDataset, Conversation, Turn, Fact } from '../types';

interface MemoryBenchRow {
  test_idx: bigint;
  input_prompt: string;
  dataset_name: string;
  lang: string;
  info: string;
  origin_question: string;
  dialog_bm25_dialog?: string;
  dialog_embedder?: string;
  [key: string]: unknown;
}

interface MemoryBenchInfo {
  golden_answer: string | Record<string, string>;
  category: number;
  evidence: Array<{
    speaker: string;
    dia_id: string;
    text: string;
  }>;
}

/**
 * Parse dialog string into Turn array
 * Dialog format: [{"role": "user", "content": "..."}]
 */
function parseDialog(dialogStr: string | undefined): Turn[] {
  if (!dialogStr) return [];

  try {
    const parsed = JSON.parse(dialogStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: { role: string; content: string }) => ({
      role: item.role === 'user' ? 'user' as const : 'assistant' as const,
      content: item.content,
    }));
  } catch {
    return [];
  }
}

/**
 * Extract conversation turns from context in input_prompt
 */
function extractConversationFromPrompt(inputPrompt: string): Turn[] {
  const turns: Turn[] = [];

  // Extract speaker turns from the prompt
  // Pattern: "Speaker [Name]says : [content]"
  const speakerPattern = /Speaker (\w+)says\s*:\s*([^]*?)(?=Speaker \w+says\s*:|$)/g;
  let match;

  while ((match = speakerPattern.exec(inputPrompt)) !== null) {
    const speaker = match[1];
    const content = match[2].trim();
    if (content) {
      turns.push({
        role: 'user', // Treat all dialog participants as user context
        content: `${speaker}: ${content}`,
      });
    }
  }

  return turns;
}

/**
 * Extract facts from evidence in info field
 */
function extractFacts(info: MemoryBenchInfo, convId: string): Fact[] {
  const facts: Fact[] = [];

  if (info.evidence && Array.isArray(info.evidence)) {
    info.evidence.forEach((ev, idx) => {
      facts.push({
        id: `${convId}-fact-${idx + 1}`,
        content: ev.text,
        category: 'event' as const,
      });
    });
  }

  // Add the golden answer as a fact
  if (info.golden_answer) {
    let answerContent: string;
    if (typeof info.golden_answer === 'string') {
      answerContent = info.golden_answer;
    } else {
      // For multiple choice, extract the correct answer
      // Usually the correct answer is marked with a specific key
      answerContent = Object.values(info.golden_answer).join(' | ');
    }
    facts.push({
      id: `${convId}-golden`,
      content: answerContent,
      category: 'personal' as const,
    });
  }

  return facts;
}

/**
 * Transform a MemoryBench row to memaudit Conversation
 */
function transformRow(row: MemoryBenchRow, index: number): Conversation {
  const convId = `memorybench-${row.dataset_name}-${index}`;

  // Parse info JSON
  let info: MemoryBenchInfo;
  try {
    info = JSON.parse(row.info);
  } catch {
    info = { golden_answer: '', category: 0, evidence: [] };
  }

  // Get turns from dialog field or extract from prompt
  let turns = parseDialog(row.dialog_embedder);
  if (turns.length === 0) {
    turns = parseDialog(row.dialog_bm25_dialog);
  }
  if (turns.length === 0) {
    turns = extractConversationFromPrompt(row.input_prompt);
  }

  // Add the question as a system turn
  if (row.origin_question) {
    turns.push({
      role: 'system' as const,
      content: `Question: ${row.origin_question}`,
    });
  }

  const facts = extractFacts(info, convId);

  return {
    id: convId,
    turns,
    facts,
  };
}

/**
 * Load MemoryBench Arrow file and transform to memaudit format
 */
export function loadMemoryBenchArrow(arrowPath: string): MemoryDataset {
  const data = readFileSync(arrowPath);
  const table = tableFromIPC(data);

  const conversations: Conversation[] = [];

  for (let i = 0; i < table.numRows; i++) {
    const row = table.get(i) as unknown as MemoryBenchRow;
    const conv = transformRow(row, i);
    if (conv.turns.length > 0 || conv.facts.length > 0) {
      conversations.push(conv);
    }
  }

  return {
    id: `memorybench-${arrowPath.split('/').pop()?.replace('.arrow', '') || 'unknown'}`,
    conversations,
  };
}

/**
 * Transform and save MemoryBench data to memaudit JSON format
 */
export function transformMemoryBenchToJson(
  arrowPath: string,
  outputPath: string,
  maxSamples?: number
): MemoryDataset {
  const dataset = loadMemoryBenchArrow(arrowPath);

  // Optionally limit samples
  if (maxSamples && dataset.conversations.length > maxSamples) {
    dataset.conversations = dataset.conversations.slice(0, maxSamples);
    dataset.id = `${dataset.id}-sampled-${maxSamples}`;
  }

  writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
  return dataset;
}
