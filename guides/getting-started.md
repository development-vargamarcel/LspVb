# Getting Started

This guide covers the installation and basic usage of the SimpleVB Language Server.

## Prerequisites

- [Node.js](https://nodejs.org/) (Version 14 or higher recommended)
- [npm](https://www.npmjs.com/)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/simple-vb-language-server.git
    cd simple-vb-language-server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Build the project:**
    ```bash
    npm run build
    ```

## Running the Server

The server is designed to communicate via Standard I/O (stdio), making it compatible with most LSP clients (VS Code, Monaco Editor, Neovim, etc.).

### Command

```bash
node out/server.js --stdio
```

### Integration Examples

#### VS Code (via Extension)

To use this server in VS Code, you would typically wrap it in a VS Code Extension. The `serverOptions` would point to the command above.

```typescript
const serverOptions: ServerOptions = {
    run: { command: 'node', args: ['path/to/out/server.js', '--stdio'] },
    debug: { command: 'node', args: ['path/to/out/server.js', '--stdio'] }
};
```

#### Monaco Editor

You can use the `monaco-languageclient` library to connect Monaco Editor to this server via a WebSocket (requires a small WebSocket-to-stdio proxy).

## Troubleshooting

### Enable Debug Logs

The server sends log messages to the client.

- **VS Code**: You can view these logs in the "Output" panel. Select "SimpleVB Language Server" (or the name you registered the server with) from the dropdown.
- **Other Clients**: Check your client's documentation on how to view LSP `window/logMessage` output.

The server logs `[Info]`, `[Warn]`, `[Error]`, and `[Debug]` messages. Debug messages provide detailed information about internal operations (validation steps, symbol parsing, etc.).
