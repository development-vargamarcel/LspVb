import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { onSignatureHelp } from '../src/features/signatureHelp';

describe('Signature Help Feature', () => {
    it('should provide signature help for Sub', () => {
        const content = `
        Sub MySub(x As Integer, y As String)
        End Sub

        MySub(
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        // "MySub(" is on line 4 (index 3 zero-based if stripping empty lines, but here explicit)
        // 0: empty
        // 1: Sub MySub...
        // 2: End Sub
        // 3: empty
        // 4: MySub(
        const position = Position.create(4, 14); // After '('

        const help = onSignatureHelp({
            textDocument: { uri: document.uri },
            position: position,
            context: { triggerKind: 1, isRetrigger: false }
        }, document);

        expect(help).to.not.be.null;
        expect(help!.signatures).to.have.lengthOf(1);
        expect(help!.signatures[0].label).to.contain('MySub(x As Integer, y As String)');
        expect(help!.signatures[0].parameters).to.have.lengthOf(2);
        expect(help!.signatures[0].parameters![0].label).to.equal('x As Integer');
        expect(help!.signatures[0].parameters![1].label).to.equal('y As String');
    });

    it('should identify active parameter', () => {
        const content = `
        Sub MySub(x As Integer, y As String)
        End Sub

        MySub(1,
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(4, 17); // After ','

        const help = onSignatureHelp({
            textDocument: { uri: document.uri },
            position: position,
            context: { triggerKind: 1, isRetrigger: false }
        }, document);

        expect(help).to.not.be.null;
        expect(help!.activeParameter).to.equal(1); // Second parameter
    });

    it('should return null if not in a function call', () => {
        const content = `
        Sub MySub(x As Integer)
        End Sub

        MySub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const position = Position.create(4, 13); // After 'MySub'

        const help = onSignatureHelp({
            textDocument: { uri: document.uri },
            position: position,
            context: { triggerKind: 1, isRetrigger: false }
        }, document);

        expect(help).to.be.null;
    });
});
