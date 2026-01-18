# Visual Basic Language Server

A lightweight Language Server Protocol (LSP) implementation for Visual Basic, designed to work with Monaco Editor or VS Code.

## Features

- **Code Completion**: Context-aware completion for keywords (`If`, `For`, `Sub`, etc.) and basic types.
- **Diagnostics**: Real-time validation for:
    - Missing block endings (e.g., `If` without `End If`).
    - Missing `Then` in `If` statements.
    - `Dim` declarations without types (Warning).
    - `Const` declarations without values.
    - Mismatched blocks (e.g., closing `If` with `End Sub`).
- **Document Symbols**: Outline view support for Sub, Function, Class, Module, Constants, and Variables.
- **Hover Information**: Basic hover support.
- **Folding**: Range folding for blocks.
- **Formatting**: Basic indentation adjustment.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Build**:
    ```bash
    npm run build
    ```

3.  **Run Server**:
    The server runs over stdio.
    ```bash
    node out/server.js --stdio
    ```

4.  **Run Tests**:
    ```bash
    npx mocha -r ts-node/register tests/*.test.ts
    ```

## Architecture

- **`src/server.ts`**: Main entry point. Handles LSP connection and event delegation.
- **`src/features/`**: Contains individual feature implementations (completion, validation, etc.).
- **`src/utils/parser.ts`**: Regex-based parser for symbol extraction.
- **`src/utils/regexes.ts`**: Centralized regex definitions.
- **`src/utils/logger.ts`**: Simple logging wrapper.

## Assumptions & Limitations

- The parser is regex-based and may not handle all edge cases of full VB syntax (e.g., complex multi-line statements with line continuations in unexpected places).
- Validation is heuristic-based (stack logic).
- Case insensitivity is handled by regex flags, but some logic might assume normalized input.
