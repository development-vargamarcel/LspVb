# Visual Basic Language Server

A lightweight Language Server Protocol (LSP) implementation for Visual Basic, designed to work with Monaco Editor or VS Code.

## Features

- **Code Completion**: Context-aware completion for keywords (`If`, `For`, `Sub`, etc.) and basic types, including snippets for common control structures.
- **Diagnostics**: Real-time validation for:
    - Syntax errors: Missing `Then` in `If` statements, `Dim` declarations without types, `Const` without values.
    - Block structure errors: Missing closing statements (`End Sub`, `Next`, etc.), mismatched blocks (e.g., closing `If` with `End Sub`), and unclosed nested blocks.
- **Document Symbols**: Outline view support for Sub, Function, Class, Module, Constants, and Variables.
- **Hover Information**: Basic hover support for keywords and user-defined symbols.
- **Folding**: Range folding for blocks (`Sub`, `Function`, `If`, `For`, `Do`, `While`, etc.).
- **Formatting**: Auto-formatting support for indentation of blocks and nested structures.
- **Range Formatting**: Supports formatting a specific selection of code.
- **Go to Definition**: Jump to the definition of a symbol within the same file.
- **Find References**: Find all occurrences of a symbol within the same file (scope-aware).
- **Rename**: Rename a symbol and all its occurrences (scope-aware).
- **Code Actions**: Quick fixes for common errors (e.g., adding missing `Then`, `As`, or closing statements).
- **Signature Help**: Parameter hints for function and subroutine calls.
- **Semantic Tokens**: Syntax highlighting for different symbol types (classes, variables, etc.).
- **Document Highlight**: Highlights all occurrences of a symbol in the editor.

## Architecture

- **`src/server.ts`**: Main entry point. Handles LSP connection and event delegation. Uses a `ValidationScheduler` for debounced validation.
- **`src/features/`**: Contains individual feature implementations (completion, validation, etc.).
    - `validation.ts`: Implements a `Validator` class with stack-based logic for block structures and regex-based line checks.
    - `formatting.ts`: Handles document indentation using rule-based logic.
    - `completion.ts`: Provides completions and snippets.
- **`src/utils/`**: Helper utilities.
    - `parser.ts`: Regex-based parser for symbol extraction.
    - `regexes.ts`: Centralized regex definitions for consistency.
    - `scheduler.ts`: Manages validation scheduling (debouncing).
    - `safeHandler.ts`: Wrapper for LSP handlers to ensure safe execution and consistent error logging.
    - `logger.ts`: Simple logging wrapper.

## Setup & Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Build**:
    ```bash
    npm run build
    ```

3.  **Run Tests**:
    The project uses Mocha and Chai for testing.
    ```bash
    npm test
    ```

4.  **Run Server**:
    The server runs over stdio.
    ```bash
    node out/server.js --stdio
    ```

## Troubleshooting

### Enable Debug Logs

The server sends log messages to the client.

- **VS Code**: You can view these logs in the "Output" panel. Select "SimpleVB Language Server" (or the name you registered the server with) from the dropdown.
- **Other Clients**: Check your client's documentation on how to view LSP `window/logMessage` output.

The server logs `[Info]`, `[Warn]`, `[Error]`, and `[Debug]` messages. Debug messages provide detailed information about internal operations (validation steps, symbol parsing, etc.).

## Assumptions & Limitations

- **Heuristic Parsing**: The parser is regex-based and optimized for speed. It may not handle all edge cases of full VB syntax (e.g., complex multi-line statements with line continuations in unexpected places).
- **Validation**: Block validation assumes a well-formed structure. While it handles nested blocks, extremely complex nesting or mixed control structures might produce generic error messages.
- **Case Sensitivity**: The server is largely case-insensitive for keywords (VB style), but internal logic normalizes keys to lowercase for lookups.
