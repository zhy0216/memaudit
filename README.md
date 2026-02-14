# memaudit

Agent memory auditing toolkit for evaluating LLM memory capabilities.

## Features

- **Memory Recall Accuracy**: Tests if the model correctly recalls facts from conversation history
- **Hallucination Detection**: Identifies when models "remember" things that never happened
- **Conflict Resolution**: Evaluates handling of contradictory information over time
- **Temporal Accuracy**: Tests correct ordering of events

## Installation

```bash
npm install
npm run build
```

## Quick Start

### Validate a dataset

```bash
node dist/cli.js validate data/sample-dataset.json
```

### Run an audit (requires OpenAI API key)

```bash
OPENAI_API_KEY=sk-xxx node dist/cli.js audit data/sample-dataset.json
```

### Using the example script

```bash
OPENAI_API_KEY=sk-xxx ./examples/run-audit.sh
```

## Using Real Datasets

### MemoryBench (THUIR)

memaudit includes an adapter for [MemoryBench](https://huggingface.co/datasets/THUIR/MemoryBench), a benchmark for memory and continual learning in LLM systems.

#### Fetch and prepare the dataset

```bash
# Fetch MemoryBench Locomo subset (5 samples by default)
npm run fetch:memorybench

# Or specify number of samples
npm run build && node scripts/fetch-memorybench.js --samples 10
```

#### Validate the real dataset

```bash
node dist/cli.js validate data/real/memorybench-locomo.json
```

#### Run audit on real dataset

```bash
OPENAI_API_KEY=sk-xxx node dist/cli.js audit data/real/memorybench-locomo.json --output ./audit-results-memorybench
```

### Dataset Provenance

The MemoryBench data is stored in `data/real/` with full provenance information:

- **Source**: [THUIR/MemoryBench](https://huggingface.co/datasets/THUIR/MemoryBench)
- **Paper**: [arXiv:2510.17281](https://arxiv.org/abs/2510.17281)
- **License**: MIT
- **Subset**: Locomo-0 (test split)

See `data/real/PROVENANCE.json` for full attribution and citation.

## CLI Reference

```bash
memaudit audit <dataset> [options]
  --model, -m <model>    Model to use (default: gpt-4o-mini)
  --output, -o <dir>     Output directory (default: ./audit-results)
  --format, -f <format>  Output format: all|json|markdown (default: all)

memaudit validate <dataset>
  Validate dataset format without running audit
```

## Dataset Format

```json
{
  "id": "dataset-id",
  "conversations": [
    {
      "id": "conv-1",
      "turns": [
        { "role": "user", "content": "My name is Alice" },
        { "role": "assistant", "content": "Hello Alice!" }
      ],
      "facts": [
        { "id": "fact-1", "content": "User's name is Alice", "category": "personal" }
      ]
    }
  ]
}
```

### Fact Categories

- `personal`: Personal information about the user
- `preference`: User preferences
- `event`: Events that happened
- `relationship`: Relationships between entities

### Conflict Resolution

Use `supersedes` to mark facts that replace older ones:

```json
{
  "id": "fact-2",
  "content": "User lives in Portland",
  "supersedes": "fact-1"
}
```

## Development

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## Output

After running an audit, you'll find:

- `audit-results/report.md` - Human-readable markdown report
- `audit-results/results.json` - Machine-readable JSON with all details

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `OPENAI_BASE_URL` | Custom API endpoint | OpenAI default |
| `MEMAUDIT_MODEL` | Default model | gpt-4o-mini |

## License

MIT

## Citation

If you use the MemoryBench dataset, please cite:

```bibtex
@article{ai2025memorybench,
  title={MemoryBench: A Benchmark for Memory and Continual Learning in LLM Systems},
  author={Ai, Qingyao and Tang, Yichen and Wang, Changyue and Long, Jianming and Su, Weihang and Liu, Yiqun},
  journal={arXiv preprint arXiv:2510.17281},
  year={2025}
}
```
