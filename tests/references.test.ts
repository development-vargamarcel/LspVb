import { expect } from 'chai';
import { onReferences } from '../src/features/references';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ReferenceParams, Position } from 'vscode-languageserver/node';

describe('References Feature', () => {
    it('should find all references of a variable', () => {
        const text = `
Sub Main()
    Dim x As Integer
    x = 10
    Print(x)
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(2, 8); // "Dim x" -> position of x

        const params: ReferenceParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: position,
            context: { includeDeclaration: true }
        };

        const references = onReferences(params, document);

        // Should find 3 occurrences of 'x': Dim x, x = 10, Print(x)
        expect(references).to.have.lengthOf(3);

        // Verify positions (lines 2, 3, 4) - note: text split makes lines 0-indexed based on the provided string.
        // First empty line is 0.
        // Sub Main() is 1.
        // Dim x is 2.
        // x = 10 is 3.
        // Print(x) is 4.

        expect(references[0].range.start.line).to.equal(2);
        expect(references[1].range.start.line).to.equal(3);
        expect(references[2].range.start.line).to.equal(4);
    });

    it('should be case insensitive', () => {
         const text = `
Dim myVar As Integer
MYVAR = 5
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(1, 4); // "myVar"

        const params: ReferenceParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: position,
            context: { includeDeclaration: true }
        };

        const references = onReferences(params, document);
        expect(references).to.have.lengthOf(2);
    });

    it('should ignore substrings in other words (word boundary check)', () => {
        const text = `
Dim x As Integer
Dim xy As Integer
x = 1
xy = 2
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(1, 4); // "x"

        const params: ReferenceParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: position,
            context: { includeDeclaration: true }
        };

        const references = onReferences(params, document);
        // Should find "Dim x" and "x = 1". Should NOT find "xy"
        expect(references).to.have.lengthOf(2);
    });

    it('should ignore comments if possible', () => {
         const text = `
Dim x As Integer
' This is x in a comment
x = 1
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(1, 4); // "x"

        const params: ReferenceParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: position,
            context: { includeDeclaration: true }
        };

        const references = onReferences(params, document);
        // Should find "Dim x" and "x = 1".
        // The implementation tries to ignore comments.
        expect(references).to.have.lengthOf(2);
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
        // Position on 'x' in Sub A (line 3)
        // Line 0: empty
        // Line 1: Sub A
        // Line 2: Dim x
        // Line 3: x = 1
        const position = Position.create(3, 4);

        const params: ReferenceParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: position,
            context: { includeDeclaration: true }
        };

        const references = onReferences(params, document);

        // Should find 'Dim x' (line 2) and 'x = 1' (line 3) in Sub A.
        // Should NOT find 'Dim x' (line 7) or 'x = 2' (line 8) in Sub B.
        expect(references).to.have.lengthOf(2);
        expect(references[0].range.start.line).to.equal(2);
        expect(references[1].range.start.line).to.equal(3);
    });

    it('should find references across multiple documents', () => {
        const text1 = `
Public Class SharedData
End Class
        `;
        const text2 = `
Sub Main()
    Dim x As SharedData
End Sub
        `;
        const doc1 = TextDocument.create('file:///file1.vb', 'vb', 1, text1);
        const doc2 = TextDocument.create('file:///file2.vb', 'vb', 1, text2);

        // Find refs for SharedData. Cursor on "SharedData" in doc2.
        const position = Position.create(2, 13); // Dim x As SharedData

        const params: ReferenceParams = {
            textDocument: { uri: 'file:///file2.vb' },
            position: position,
            context: { includeDeclaration: true }
        };

        const references = onReferences(params, doc2, [doc1, doc2]);

        // Should find:
        // 1. Definition in file1 (Public Class SharedData)
        // 2. Usage in file2 (Dim x As SharedData)
        expect(references).to.have.lengthOf(2);
        expect(references.find(r => r.uri === 'file:///file1.vb')).to.exist;
        expect(references.find(r => r.uri === 'file:///file2.vb')).to.exist;
    });
});
