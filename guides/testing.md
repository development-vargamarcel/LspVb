# Testing Guide

This guide explains the testing infrastructure for the SimpleVB Language Server.

## Overview

We use **Mocha** as the test runner and **Chai** for assertions. The tests are written in TypeScript and executed using `ts-node`.

## Running Tests

To run all tests:

```bash
npm test
```

This command runs `mocha` with the `ts-node/register` hook, which compiles the TypeScript test files on the fly.

## Test Structure

Tests are located in the `tests/` directory.

| File | Description |
|------|-------------|
| `parser.test.ts` | Tests for symbol extraction (Document Symbols). Checks if Subs, Functions, and Variables are correctly identified. |
| `parser_hierarchical.test.ts` | Tests specifically for the nesting of symbols (e.g., Methods inside Classes). |
| `validation.test.ts` | Tests for the validator. Ensures syntax errors (missing `End Sub`, mismatched blocks) are detected. |
| `formatting.test.ts` | Tests for the document formatter. Checks indentation logic. |

## Writing Tests

### 1. Parser Tests

Parser tests verify that `parseDocumentSymbols` correctly processes the source code.

```typescript
import * as assert from 'assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols } from '../src/utils/parser';

describe('My Feature Tests', () => {
    it('should parse my new syntax', () => {
        const content = 'MyNewSyntax foo';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(doc);

        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, 'foo');
    });
});
```

### 2. Validation Tests

Validation tests check if `validateTextDocument` returns the correct diagnostics.

> Note: Since `validateTextDocument` might rely on internal logic, we often test the `Validator` class logic or the `validate` function directly if exported, or simulate the validation process.

(In this codebase, validation logic is often tested by creating a document and checking the output of the validation function).

### 3. Formatting Tests

Formatting tests check if the code is indented correctly.

```typescript
import * as assert from 'assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { formatDocument } from '../src/features/formatting';

it('should indent correctly', () => {
    const input = 'Sub Foo\nDim x\nEnd Sub';
    const expected = 'Sub Foo\n    Dim x\nEnd Sub';
    // ... setup doc ...
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true });
    // ... apply edits and assert ...
});
```

## Continuous Integration

Ensure that `npm test` passes before submitting any Pull Request.
