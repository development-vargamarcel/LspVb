import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { onTypeDefinition } from '../src/features/typeDefinition';

describe('Type Definition Feature', () => {
    it('should find type definition of a variable', () => {
        const text = `
Class Person
    Dim Name As String
End Class

Sub Main()
    Dim p As Person
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        // Position of 'p' in 'Dim p As Person' (Line 6, char 8)
        // Dim p As Person
        // 0123456789
        const position = Position.create(6, 8);

        const result = onTypeDefinition({ textDocument: { uri: document.uri }, position }, document);

        expect(result).to.exist;
        if (Array.isArray(result)) {
            // If Location[]
            expect(result).to.have.lengthOf(1);
            expect(result[0].range.start.line).to.equal(1); // Class Person start
        } else {
            // If Location or DefinitionLink[]
            expect((result as any).range.start.line).to.equal(1);
        }
    });

    it('should return null if type not found', () => {
        const text = `
Sub Main()
    Dim x As UnknownType
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(2, 8);

        const result = onTypeDefinition({ textDocument: { uri: document.uri }, position }, document);
        expect(result).to.be.null;
    });
});
