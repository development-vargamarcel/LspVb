# Simple Visual Basic Language Server

This is a simple Language Server Protocol (LSP) implementation for Visual Basic, designed to be compatible with editors like Monaco Editor.

## Features

*   **Completions**: Basic Visual Basic keywords (e.g., `Dim`, `If`, `Then`, `Else`, `Sub`, `Function`, etc.).
*   **Diagnostics**:
    *   Checks for `If` statements missing `Then`.
    *   Checks for `Dim` declarations missing `As` (variable type).

## Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the server:
    ```bash
    npm run build
    ```

## Usage

The server runs on Node.js and communicates via standard input/output (stdio).

To start the server:

```bash
node out/server.js --stdio
```

## Integrating with Monaco Editor

To use this language server with Monaco Editor, you typically need a WebSocket to connecting the browser to the server process. Since this server runs over stdio, you can use a library like `monaco-languageclient` and a WebSocket bridge (like `vscode-ws-jsonrpc`).

### Conceptual Setup

1.  **Backend (Node.js)**:
    *   Set up a WebSocket server (e.g., using `ws`).
    *   When a connection is received, spawn the language server process:
        ```javascript
        const ws = require('ws');
        const http = require('http');
        const url = require('url');
        const net = require('net');
        const express = require('express');
        const rpc = require('vscode-ws-jsonrpc');
        const server = require('vscode-ws-jsonrpc/server');
        const launch = require('vscode-ws-jsonrpc/server/launch');

        const wss = new ws.Server({
            noServer: true,
            perMessageDeflate: false
        });

        const serverPort = 3000;

        // ... setup express/http server ...

        server.on('upgrade', (request, socket, head) => {
            // ... handle upgrade ...
             wss.handleUpgrade(request, socket, head, webSocket => {
                const socket = {
                    send: content => webSocket.send(content, error => {
                        if (error) {
                            throw error;
                        }
                    }),
                    onMessage: cb => webSocket.on('message', cb),
                    onError: cb => webSocket.on('error', cb),
                    onClose: cb => webSocket.on('close', cb),
                    dispose: () => webSocket.close()
                };
                // Launch the language server
                if (webSocket.readyState === webSocket.OPEN) {
                    launch(socket);
                } else {
                    webSocket.on('open', () => launch(socket));
                }
            });
        });

        function launch(socket) {
            const reader = new rpc.WebSocketMessageReader(socket);
            const writer = new rpc.WebSocketMessageWriter(socket);
            // Start the language server process
            const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
            const serverConnection = server.createServerProcess('VB-LSP', 'node', ['/path/to/out/server.js', '--stdio']);
            server.forward(socketConnection, serverConnection, message => {
                if (rpc.isRequestMessage(message)) {
                    // ...
                }
                return message;
            });
        }
        ```

2.  **Frontend (Browser/Monaco)**:
    *   Use `monaco-languageclient` to connect to the WebSocket.
    *   Register the language and the client.

    ```javascript
    import { MonacoLanguageClient, CloseAction, ErrorAction, MonacoServices, MessageConnection } from 'monaco-languageclient';
    import { listen } from 'vscode-ws-jsonrpc';
    import normalizeUrl from 'normalize-url';

    // ... setup Monaco ...

    // create the web socket
    const url = createUrl('/sampleServer');
    const webSocket = new WebSocket(url);

    listen({
        webSocket,
        onConnection: connection => {
            // create and start the language client
            const languageClient = createLanguageClient(connection);
            const disposable = languageClient.start();
            connection.onClose(() => disposable.dispose());
        }
    });

    function createLanguageClient(connection) {
        return new MonacoLanguageClient({
            name: "Visual Basic Language Client",
            clientOptions: {
                // use a language id as a document selector
                documentSelector: ['vb'],
                // disable the default error handler
                errorHandler: {
                    error: () => ErrorAction.Continue,
                    closed: () => CloseAction.DoNotRestart
                }
            },
            // create a language client connection from the JSON RPC connection on demand
            connectionProvider: {
                get: (errorHandler, closeHandler) => {
                    return Promise.resolve(connection);
                }
            }
        });
    }
    ```
