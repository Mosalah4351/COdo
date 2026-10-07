# COdo

AI-powered coding agent with a terminal UI. Build from specs, COdo the rest.

## Installation

```bash
npm install -g @codo-ai/cli
```

Or download a platform-specific binary directly:

```bash
# Linux x64
npm install -g @codo-ai/codo-linux-x64

# macOS (Apple Silicon)
npm install -g @codo-ai/codo-darwin-arm64

# Windows x64
npm install -g @codo-ai/codo-windows-x64
```

## Usage

```bash
# Start the TUI
codo

# Show version
codo --version

# Show help
codo --help
```

## Features

- **Terminal UI** - Full-featured TUI with agent interface built with opentui
- **AI Agents** - Built-in support for multiple AI providers (OpenAI, Anthropic, etc.)
- **Session Management** - Persistent sessions with history
- **File Operations** - Read, write, edit, and search files
- **Git Integration** - Built-in git operations
- **Plugin System** - Extensible plugin architecture

## Configuration

COdo stores configuration in `~/.config/codo/` (or `%APPDATA%\codo\` on Windows).

## Documentation

- [GitHub Repository](https://github.com/COdo-ai/COdo)
- [Issues](https://github.com/COdo-ai/COdo/issues)

## License

MIT