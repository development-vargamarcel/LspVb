import * as assert from 'assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols } from '../src/utils/parser';
import { SymbolKind } from 'vscode-languageserver/node';

describe('Parser Tests', () => {
    it('should parse Sub', () => {
        const content = 'Sub TestSub\nEnd Sub';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(doc);

        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, 'TestSub');
        assert.strictEqual(symbols[0].kind, SymbolKind.Method);
    });

    it('should parse Function', () => {
        const content = 'Public Function TestFunc\nEnd Function';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(doc);

        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, 'TestFunc');
        assert.strictEqual(symbols[0].kind, SymbolKind.Function);
    });

    it('should parse Dim', () => {
        const content = 'Dim x As Integer';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(doc);

        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, 'x');
        assert.strictEqual(symbols[0].kind, SymbolKind.Variable);
    });

    it('should parse Const', () => {
        const content = 'Const PI = 3.14';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(doc);

        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, 'PI');
        assert.strictEqual(symbols[0].kind, SymbolKind.Constant);
    });
});
