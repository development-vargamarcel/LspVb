import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateTextDocument } from '../src/features/validation';

describe('Validation Feature - Type Checking', () => {
    it('should NOT warn on built-in types', () => {
        const text = `
Dim x As Integer
Dim y As String
Dim z As Object
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const typeWarnings = diagnostics.filter(d => d.message.includes('Type') && d.message.includes('not defined'));
        expect(typeWarnings).to.be.empty;
    });

    it('should warn on unknown types', () => {
        const text = `
Dim x As UnknownType
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const typeWarnings = diagnostics.filter(d => d.message.includes("Type 'UnknownType' is not defined"));
        expect(typeWarnings).to.have.lengthOf(1);
    });

    it('should find types defined in the same file', () => {
        const text = `
Class MyClass
End Class

Dim x As MyClass
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const typeWarnings = diagnostics.filter(d => d.message.includes('not defined'));
        expect(typeWarnings).to.be.empty;
    });

    it('should find types defined in other files', () => {
        const text1 = `
Class GlobalClass
End Class
`;
        const text2 = `
Dim x As GlobalClass
`;
        const doc1 = TextDocument.create('file:///1.vb', 'vb', 1, text1);
        const doc2 = TextDocument.create('file:///2.vb', 'vb', 1, text2);

        const diagnostics = validateTextDocument(doc2, [doc1, doc2]);

        const typeWarnings = diagnostics.filter(d => d.message.includes('not defined'));
        expect(typeWarnings).to.be.empty;
    });
});
