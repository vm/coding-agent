<div align="center">

# Coding Agent

**A terminal UI coding assistant with a small, explicit toolset (read/edit/list files + run commands)**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)](https://bun.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Built with **React + Ink** for the UI and the **OpenAI SDK** for model calls (supports both direct OpenAI and OpenRouter).

[Quick Start](#quick-start) • [What it can do](#what-can-it-do) • [Tool reference](#tool-reference) • [Development](#development)

---

</div>

## What can it do?

The agent chats in the terminal and can invoke a small set of tools to operate on your machine:

| Capability | Notes |
|---|---|
| **Read files** | Reads exact file paths |
| **Edit files** | Replaces a specific string once, or creates a file |
| **List directory contents** | Non-recursive, hides dotfiles |
| **Run commands** | Executes a program with args (no shell features like pipes/redirects) |

**Just ask naturally:**
- *"Show me src/tools/index.ts"*
- *"Update README.md to include a tool reference section"*
- *"List files in src/tools"*
- *"Run bun test"*

---

## Quick Start

### Prerequisites

- **[Bun](https://bun.sh)** installed on your system
- Either:
  - **OpenAI API key** from [platform.openai.com](https://platform.openai.com/) as `OPENAI_API_KEY`, or
  - **OpenRouter API key** from [openrouter.ai](https://openrouter.ai/) as `OPENROUTER_API_KEY`

### Installation

```bash
bun install
```

**Option 1: Direct OpenAI**
```bash
echo "OPENAI_API_KEY=your-key-here" > .env
echo "OPENAI_MODEL=gpt-4o" >> .env
bun run start
```

**Option 2: OpenRouter (supports OpenAI, Anthropic, and other models)**
```bash
echo "OPENROUTER_API_KEY=your-key-here" > .env
echo "OPENROUTER_MODEL=openai/gpt-4o" >> .env
# Or use Anthropic models: echo "OPENROUTER_MODEL=anthropic/claude-3.5-sonnet" >> .env
bun run start
```

Bun automatically loads `.env` for processes it starts. If you prefer, you can also set the environment variables in your shell.

---

## How It Works

The agent maintains a chat transcript and calls tools when the model requests them.

```
┌─────────────────┐
│  You: Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Model responds │
│  with text and/ │
│  or tool calls  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tools execute  │
│  locally        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Show Results   │
└─────────────────┘
```

### Working directory and paths

The system prompt includes your **current working directory**. Tool paths are treated as the model provides them, so it’s best to run the agent from the directory you want to operate on (or provide absolute paths).

---

## Development

```bash
bun test

bun run test:watch

bun run test:coverage

bun run typecheck
```

### Scripts

| Command | Description |
|---|---|
| `bun run start` | Start the Ink UI app |
| `bun test` | Run tests |
| `bun run test:watch` | Watch tests |
| `bun run test:coverage` | Coverage |
| `bun run typecheck` | TypeScript check |

---

## Tool reference

The tools are defined in `src/tools/index.ts` and currently include:

### `read_file`

- **Input**: `{ path: string }`
- **Behavior**: reads file contents, returns an error string on failure.

### `edit_file`

- **Input**: `{ path: string; old_str: string; new_str: string }`
- **Behavior**:
  - If `old_str` is empty, creates the file (creating parent directories as needed).
  - Otherwise replaces the **single** matching occurrence of `old_str`.
  - If `old_str` occurs multiple times, it errors to avoid ambiguous edits.

### `list_files`

- **Input**: `{ path: string }`
- **Behavior**: lists immediate children, **non-recursive**, and skips entries starting with `.`.

### `run_command`

- **Input**: `{ command: string }`
- **Behavior**: executes a program directly (splitting args with basic quote handling).
- **Limitations**: it does **not** run through a shell, so these won’t work: pipes (`|`), redirects (`>`, `<`), `&&`, glob expansion, shell builtins.

---

## Project structure

```
src/
  agent/        Agent + OpenAI/OpenRouter integration
  components/   Ink UI
  shared/       Transcript parsing/types
  tools/        Local tool implementations
tests/          Mirrors src/ with .test.ts files
plans/          Design notes / roadmap
```

---

## Configuration

### Environment variables

**For Direct OpenAI:**
| Variable | Required | Description |
|---|---:|---|
| `OPENAI_API_KEY` | Yes | API key from OpenAI |
| `OPENAI_MODEL` | Yes | Model name (e.g., `gpt-4o`, `gpt-4-turbo`) |

**For OpenRouter:**
| Variable | Required | Description |
|---|---:|---|
| `OPENROUTER_API_KEY` | Yes | API key from OpenRouter |
| `OPENROUTER_MODEL` | Yes | Model identifier (e.g., `openai/gpt-4o`, `anthropic/claude-3.5-sonnet`) |
| `OPENROUTER_SITE_URL` | No | Site URL for OpenRouter headers (default: `https://github.com`) |
| `OPENROUTER_APP_NAME` | No | App name for OpenRouter headers (default: `Coding Agent`) |

The agent will automatically detect which provider to use based on which API key is set. If both are set, `OPENAI_API_KEY` takes precedence.

---

## Troubleshooting

**"API key not found"**
- Ensure your `.env` file contains either `OPENAI_API_KEY` and `OPENAI_MODEL`, or `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`
- Ensure you are starting the agent from the directory containing `.env`, or export the variables in your shell

**"Command not found: bun"**
- Install Bun from [bun.sh](https://bun.sh)
- Restart your terminal after installation

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with TypeScript, Bun, Ink, and the OpenAI SDK**

[Back to Top](#coding-agent)

</div>
