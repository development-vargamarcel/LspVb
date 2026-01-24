import { expect } from 'chai';
import { onDocumentHighlight } from '../src/features/documentHighlight';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentHighlightParams, Position } from 'vscode-languageserver/node';

describe('Document Highlight Feature', () => {
    it('should highlight all occurrences of a variable', () => {
        const text = `
Sub Main()
    Dim x As Integer
    x = 10
    Print(x)
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(2, 8); // "Dim x"

        const params: DocumentHighlightParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: position
        };

        const highlights = onDocumentHighlight(params, document);

        expect(highlights).to.have.lengthOf(3);
        expect(highlights[0].range.start.line).to.equal(2);
        expect(highlights[1].range.start.line).to.equal(3);
        expect(highlights[2].range.start.line).to.equal(4);
    });

    it('should respect scope (local variables)', () => {
        const text = `
Sub A()
    Dim x As Integer
    x = 1
End Sub

Sub B()
    Dim x As Integer
    x = 2
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(3, 4); // 'x' in Sub A

        const params: DocumentHighlightParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: position
        };

        const highlights = onDocumentHighlight(params, document);

        expect(highlights).to.have.lengthOf(2);
        expect(highlights[0].range.start.line).to.equal(2);
        expect(highlights[1].range.start.line).to.equal(3);
    });
});
