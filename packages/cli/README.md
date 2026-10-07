# @codo-ai/cli

Cross-platform CLI wrapper for COdo - AI-powered coding agent.

This package automatically installs the correct platform-specific binary for your system.

## Installation

```bash
npm install -g @codo-ai/cli
```

## Usage

```bash
codo              # Start the TUI
codo --version    # Show version
codo --help       # Show help
```

## What's New in 2.23.5-sec-test

- **Subagent accent colors** - Subagent session footer and scrollbar now use the persona's unique color for visual distinction
- **GSD installation fix** - Fixed MODULE_NOT_FOUND error when running gsd-tools.cjs; scripts now install to the correct path
- **Zen API fix** - Fixed COdo fork headers to correctly target opencode's Zen backend
- **Spinner crash fix** - Replaced native spinner with text-based animation to prevent Cell to ArrayBufferView errors

## Platform Binaries

This package depends on the following optional platform-specific packages:

- `@codo-ai/codo-darwin-arm64` - macOS Apple Silicon
- `@codo-ai/codo-darwin-x64` - macOS Intel
- `@codo-ai/codo-darwin-x64-baseline` - macOS Intel (baseline)
- `@codo-ai/codo-linux-arm64` - Linux ARM64
- `@codo-ai/codo-linux-arm64-musl` - Linux ARM64 musl
- `@codo-ai/codo-linux-x64` - Linux x64
- `@codo-ai/codo-linux-x64-baseline` - Linux x64 (baseline)
- `@codo-ai/codo-linux-x64-baseline-musl` - Linux x64 baseline musl
- `@codo-ai/codo-linux-x64-musl` - Linux x64 musl
- `@codo-ai/codo-windows-arm64` - Windows ARM64
- `@codo-ai/codo-windows-x64` - Windows x64
- `@codo-ai/codo-windows-x64-baseline` - Windows x64 (baseline)

## Security Testing

This is a security-testing fork. For the standard release, see the main branch.

## License

MIT
