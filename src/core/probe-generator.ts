import type { MemoryDataset, Probe, Fact, Turn } from '../types';

let probeCounter = 0;

function generateProbeId(): string {
  return `probe-${++probeCounter}`;
}

function getAllTurns(dataset: MemoryDataset): Turn[] {
  return dataset.conversations.flatMap(c => c.turns);
}

function getAllFacts(dataset: MemoryDataset): Fact[] {
  return dataset.conversations.flatMap(c => c.facts);
}

function generateRecallProbes(dataset: MemoryDataset): Probe[] {
  const facts = getAllFacts(dataset);
  const context = getAllTurns(dataset);

  return facts
    .filter(f => !f.supersedes) // Don't test superseded facts
    .map(fact => ({
      id: generateProbeId(),
      type: 'recall' as const,
      question: `Based on the conversation history, ${fact.content.toLowerCase().replace("user's ", "what is the user's ").replace("user ", "what did the user ")}?`,
      context,
      expectedAnswer: fact.content,
      relatedFacts: [fact.id],
    }));
}

function generateConflictProbes(dataset: MemoryDataset): Probe[] {
  const facts = getAllFacts(dataset);
  const context = getAllTurns(dataset);

  const supersedingFacts = facts.filter(f => f.supersedes);
  return supersedingFacts.map(fact => {
    const oldFact = facts.find(f => f.id === fact.supersedes);
    return {
      id: generateProbeId(),
      type: 'conflict' as const,
      question: `The user previously mentioned "${oldFact?.content}" but later said "${fact.content}". What is the current correct information?`,
      context,
      expectedAnswer: fact.content,
      relatedFacts: [fact.id, fact.supersedes!],
    };
  });
}

function generateTemporalProbes(dataset: MemoryDataset): Probe[] {
  const facts = getAllFacts(dataset).filter(f => f.timestamp);
  const context = getAllTurns(dataset);

  if (facts.length < 2) return [];

  const probes: Probe[] = [];
  for (let i = 0; i < facts.length - 1; i++) {
    const earlier = facts[i];
    const later = facts[i + 1];
    if (new Date(earlier.timestamp!) < new Date(later.timestamp!)) {
      probes.push({
        id: generateProbeId(),
        type: 'temporal' as const,
        question: `Which happened first: "${earlier.content}" or "${later.content}"?`,
        context,
        expectedAnswer: earlier.content,
        relatedFacts: [earlier.id, later.id],
      });
    }
  }
  return probes;
}

function generateHallucinationProbes(dataset: MemoryDataset): Probe[] {
  const context = getAllTurns(dataset);

  // Generate probes about things NOT mentioned
  const fakeTopics = [
    { topic: 'pet', question: "What is the user's pet's name?" },
    { topic: 'job', question: "What is the user's job title?" },
    { topic: 'hobby', question: "What is the user's favorite hobby?" },
  ];

  return fakeTopics.map(({ question }) => ({
    id: generateProbeId(),
    type: 'hallucination' as const,
    question: `Based ONLY on the conversation history, ${question} If this was never mentioned, say "Not mentioned".`,
    context,
    expectedAnswer: 'Not mentioned',
    relatedFacts: [],
  }));
}

export function generateProbes(dataset: MemoryDataset): Probe[] {
  probeCounter = 0; // Reset for deterministic IDs
  return [
    ...generateRecallProbes(dataset),
    ...generateConflictProbes(dataset),
    ...generateTemporalProbes(dataset),
    ...generateHallucinationProbes(dataset),
  ];
}
