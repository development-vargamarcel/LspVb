# Architecture

This document describes the internal architecture of the SimpleVB Language Server.

## Overview

The server is built using TypeScript and follows the [Language Server Protocol (LSP)](https://microsoft.github.io/language-server-protocol/). It uses `vscode-languageserver` to handle the connection and protocol details.

## Directory Structure

```
src/
├── features/       # Individual LSP feature implementations
├── utils/          # Helper utilities (parsing, regexes, logging)
├── keywords.ts     # Keyword definitions
├── server.ts       # Main entry point and connection setup
├── server-capabilities.ts # Server capability definitions
└── snippets.ts     # Code snippets for completion
```

## Core Components

### 1. Server Entry Point (`src/server.ts`)
- Initializes the LSP connection.
- Registers event handlers (`onCompletion`, `onHover`, `onDidChangeContent`, etc.).
- Manages the `TextDocuments` manager to track document state.
- Instantiates the `ValidationScheduler`.

### 2. Feature Modules (`src/features/`)
Each feature is isolated in its own file:
- **`validation.ts`**: Implements the `Validator` class. It iterates through document lines, checking for syntax errors (regex-based) and block structure consistency (stack-based).
- **`completion.ts`**: Aggregates keywords, document symbols, and snippets into completion items.
- **`formatting.ts`**: Implements a custom indentation logic based on block start/end patterns.
- **`definition.ts`, `hover.ts`, `folding.ts`**: Handle respective LSP requests.

### 3. Utilities (`src/utils/`)
- **`parser.ts`**: A regex-based symbol parser. It extracts Subs, Functions, Classes, and Variables for the Outline view and Code Completion.
- **`regexes.ts`**: Centralized repository of all regular expressions used across the application. This ensures consistency between parsing, validation, and formatting.
- **`textUtils.ts`**: Text processing helpers, such as `stripComment` which safely removes comments while respecting string literals.
- **`scheduler.ts`**: Implements a debounce mechanism for validation to avoid checking the document on every single keystroke.

## Data Flow

1.  **Request**: Client sends a request (e.g., `textDocument/completion`).
2.  **Handler**: `src/server.ts` receives the request and calls the appropriate feature function (e.g., `onCompletion`).
3.  **Processing**: The feature function processes the request using the current document state and helper utilities.
    - *Example*: `onCompletion` calls `parseDocumentSymbols` to get local symbols and merges them with `KEYWORDS`.
4.  **Response**: The result is returned to the client.

## Validation Loop

Validation is slightly different as it is notification-based:
1.  **Change**: User types in the editor (`onDidChangeContent`).
2.  **Schedule**: `ValidationScheduler` schedules a validation run (debounced).
3.  **Validate**: `validateTextDocument` is called. It parses the document line-by-line.
4.  **Publish**: Diagnostics are sent back to the client via `connection.sendDiagnostics`.
