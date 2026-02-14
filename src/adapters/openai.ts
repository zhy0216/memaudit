import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { Probe, Turn } from '../types';

export interface AIAdapter {
  executeProbe(probe: Probe): Promise<string>;
  checkMatch(expected: string, actual: string): Promise<boolean>;
}

export function createOpenAIAdapter(model?: string): AIAdapter {
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const modelId = model || process.env.MEMAUDIT_MODEL || 'gpt-4o-mini';

  function formatContext(turns: Turn[]): string {
    return turns
      .map(t => `${t.role.toUpperCase()}: ${t.content}`)
      .join('\n');
  }

  return {
    async executeProbe(probe: Probe): Promise<string> {
      const systemPrompt = `You are being tested on your memory recall. Answer questions based ONLY on the conversation history provided. Be concise and direct.`;

      const { text } = await generateText({
        model: openai(modelId),
        system: systemPrompt,
        prompt: `CONVERSATION HISTORY:\n${formatContext(probe.context)}\n\nQUESTION: ${probe.question}`,
      });

      return text.trim();
    },

    async checkMatch(expected: string, actual: string): Promise<boolean> {
      // Simple semantic matching via model
      const { text } = await generateText({
        model: openai(modelId),
        prompt: `Do these two statements mean the same thing? Answer only "yes" or "no".

Statement 1: "${expected}"
Statement 2: "${actual}"`,
      });

      return text.toLowerCase().includes('yes');
    },
  };
}
