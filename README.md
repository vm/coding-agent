# Coding Agent

A CLI-based coding assistant powered by Claude (Anthropic) that can read, edit, and create files, list directories, and run shell commands.

## Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up your API key:**
   - Create a `.env` file in the project root
   - Add your Anthropic API key:
     ```
     ANTHROPIC_API_KEY=your-api-key-here
     ```

## Usage

**Start the agent:**
```bash
# Navigate to the project directory you want to work on
cd /path/to/your/project

# Start the agent
bun start
```

**Important:** The agent operates in whatever directory you run `bun start` from. The working directory is displayed at the top of the UI when you start the app.

**How to use:**
1. **Navigate to your project directory** before starting the agent
2. Type your message in natural language
3. Press **Enter** to send
4. The agent will execute tools as needed to complete your request
5. Press **Ctrl+C** to quit

**Example workflow:**
```bash
# Work on a specific project
cd ~/Projects/my-web-app
bun start

# Now all file operations happen in ~/Projects/my-web-app
```

## Examples

### File Operations
- `"Create a file called hello.txt with 'Hello World'"`
- `"Read the package.json file"`
- `"Edit src/index.ts and replace 'old code' with 'new code'"`
- `"List all files in the current directory"`

### Commands
- `"Run the command: ls -la"`
- `"Execute: npm test"`

### Multi-step Tasks
- `"Create a file called fizzbuzz.js with a fizzbuzz function, then run it"`
- `"Read the README, add a new section about installation, and save it"`

## Features

- ✅ **Read files** - Read any file in your project
- ✅ **Edit files** - Replace text in files or create new files
- ✅ **List files** - Browse directory contents
- ✅ **Run commands** - Execute shell commands
- ✅ **Conversation** - Maintains context across multiple messages
- ✅ **Tool visibility** - See which tools are being executed

## Development

**Run tests:**
```bash
bun test
```

**Watch mode:**
```bash
bun test --watch
```

## Architecture

Built with:
- **Bun** - Runtime and test runner
- **TypeScript** - Type safety
- **Ink** - Terminal UI framework
- **@anthropic-ai/sdk** - Claude API client

The agent follows a TDD approach with comprehensive test coverage for all tools and the agent itself.
