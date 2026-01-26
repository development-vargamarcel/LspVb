import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { FoldingRangeParams } from 'vscode-languageserver/node';
import { onFoldingRanges } from '../src/features/folding';

describe('Folding Feature - Imports', () => {
    it('should fold consecutive Imports statements', () => {
        const text = `
Imports System
Imports System.Text
Imports System.Linq

Class MyClass
End Class
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const params: FoldingRangeParams = { textDocument: { uri: 'file:///test.vb' } };

        const ranges = onFoldingRanges(params, document);

        // Should have one fold for imports (lines 1-3)
        // Note: Lines 0 is empty.
        // Line 1: Imports System
        // Line 2: Imports System.Text
        // Line 3: Imports System.Linq
        // Line 4: empty
        // ...

        const importFold = ranges.find(r => r.kind === 'imports');
        expect(importFold).to.exist;
        expect(importFold!.startLine).to.equal(1);
        expect(importFold!.endLine).to.equal(3);
    });

    it('should fold imports at EOF', () => {
        const text = `
Imports System
Imports System.IO`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const params: FoldingRangeParams = { textDocument: { uri: 'file:///test.vb' } };

        const ranges = onFoldingRanges(params, document);

        const importFold = ranges.find(r => r.kind === 'imports');
        expect(importFold).to.exist;
        expect(importFold!.startLine).to.equal(1);
        expect(importFold!.endLine).to.equal(2);
    });
});
