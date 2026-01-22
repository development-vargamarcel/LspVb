import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { onCompletion } from '../src/features/completion';

describe('Completion Member Access', () => {
    it('should provide members of a class', () => {
        // Use Fields to avoid Block parsing issues with Property (which expects End Property in current parser)
        const content = `
        Class MyClass
            Public MyField As Integer
            Public Sub MyMethod()
            End Sub
        End Class

        Sub Main()
            Dim obj As MyClass
            obj.
        End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(9, 16); // Line 9 contains "obj."

        const items = onCompletion({ textDocument: { uri: document.uri }, position }, document);

        expect(items).to.not.be.empty;
        const fieldItem = items.find(i => i.label === 'MyField');
        const methodItem = items.find(i => i.label === 'MyMethod');

        expect(fieldItem).to.exist;
        expect(methodItem).to.exist;
        if (fieldItem) {
            expect(fieldItem.documentation).to.include('Member of MyClass');
        }
    });

    it('should NOT provide global keywords when accessing member', () => {
        const content = `
        Class MyClass
            Public MyField As Integer
        End Class

        Sub Main()
            Dim obj As MyClass
            obj.
        End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(7, 16);

        const items = onCompletion({ textDocument: { uri: document.uri }, position }, document);

        expect(items.find(i => i.label === 'If')).to.not.exist;
        expect(items.find(i => i.label === 'For')).to.not.exist;
    });

    it('should handle case insensitivity', () => {
         const content = `
        Class MyClass
            Public MyField As Integer
        End Class

        Sub Main()
            Dim OBJ As MYCLASS
            OBJ.
        End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(7, 16);

        const items = onCompletion({ textDocument: { uri: document.uri }, position }, document);
        expect(items.find(i => i.label === 'MyField')).to.exist;
    });
});
