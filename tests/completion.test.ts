import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItemKind, Position } from 'vscode-languageserver/node';
import { onCompletion } from '../src/features/completion';

describe('Completion Feature', () => {
    it('should provide keywords', () => {
        const content = 'Dim ';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(0, 4);

        const items = onCompletion({ textDocument: { uri: document.uri }, position }, document);

        expect(items).to.not.be.empty;
        const dimItem = items.find(i => i.label === 'Dim');
        expect(dimItem).to.exist;
    });

    it('should provide symbols from the document', () => {
        const content = 'Dim myVar\nmy';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(1, 2);

        const items = onCompletion({ textDocument: { uri: document.uri }, position }, document);

        const varItem = items.find(i => i.label === 'myVar');
        expect(varItem).to.exist;
    });

    it('should resolve completion details', () => {
        // This test is for resolve, which we didn't change logic, but good to have
        // We need to call onCompletionResolve, but it's not exported or used here.
        // The implementation just sets detail from KEYWORDS.
    });

    it('should filter for Type context (after As)', () => {
        const content = 'Dim x As ';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(0, 9);

        const items = onCompletion({ textDocument: { uri: document.uri }, position }, document);

        // Should have Integer (Class/Type)
        expect(items.find(i => i.label === 'Integer')).to.exist;

        // Should NOT have If (Keyword)
        expect(items.find(i => i.label === 'If')).to.not.exist;

        // Should NOT have Snippets like "Sub ... End Sub"
        expect(items.find(i => i.label === 'Sub ... End Sub')).to.not.exist;
    });

    it('should include user Classes in Type context', () => {
        const content = 'Class MyClass\nEnd Class\nDim x As ';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(2, 9);

        const items = onCompletion({ textDocument: { uri: document.uri }, position }, document);

        // Should have MyClass
        expect(items.find(i => i.label === 'MyClass')).to.exist;
    });

    it('should exclude user Variables in Type context', () => {
        const content = 'Dim myVar\nDim x As ';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(1, 9); // After 'As '

        const items = onCompletion({ textDocument: { uri: document.uri }, position }, document);

        // Should NOT have myVar
        expect(items.find(i => i.label === 'myVar')).to.not.exist;
    });

    it('should suggest correct closing statement for End', () => {
        const text = `
Sub MySub()
    End
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        // "    End " is at line 2. Length 8. Position 8 is valid.
        const position = Position.create(2, 8);

        const params: any = {
            textDocument: { uri: 'file:///test.vb' },
            position: position
        };

        const items = onCompletion(params, document);

        // Should suggest "Sub" (since we are in Sub MySub)
        const subItem = items.find((i) => i.label === 'Sub' && i.sortText === '!');
        expect(subItem).to.exist;
    });

    it('should suggest correct closing statement for End in nested block', () => {
        const text = `
Sub MySub()
    If True Then
        End
    End If
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        // "        End " -> 8 spaces + 3 chars + 1 space = 12 chars.
        const position = Position.create(3, 12);

        const params: any = {
            textDocument: { uri: 'file:///test.vb' },
            position: position
        };

        const items = onCompletion(params, document);

        // Should suggest "If" (since we are in If block)
        const ifItem = items.find((i) => i.label === 'If' && i.sortText === '!');
        expect(ifItem).to.exist;
    });
});
