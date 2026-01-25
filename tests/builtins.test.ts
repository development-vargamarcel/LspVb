import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { onCompletion, onCompletionResolve } from '../src/features/completion';
import { onHover } from '../src/features/hover';
import { onSignatureHelp } from '../src/features/signatureHelp';

describe('Built-in Library Features', () => {

    describe('Completion', () => {
        it('should provide built-in functions', () => {
            const document = TextDocument.create('file:///test.vb', 'vb', 1, '');
            const items = onCompletion({ textDocument: { uri: document.uri }, position: Position.create(0, 0) }, document);

            const lenItem = items.find(i => i.label === 'Len');
            expect(lenItem).to.exist;
            expect(lenItem!.kind).to.equal(3); // Function

            // Detail is resolved lazily
            const resolved = onCompletionResolve(lenItem!);
            expect(resolved.detail).to.contain('Integer');
        });
    });

    describe('Hover', () => {
        it('should provide hover for built-in functions', () => {
            const text = 'Dim x = Len("test")';
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            // Hover on 'Len' (char 8)
            const hover = onHover({ textDocument: { uri: document.uri }, position: Position.create(0, 8) }, document);

            expect(hover).to.exist;
            const content = (hover!.contents as any).value;
            expect(content).to.contain('Returns an integer containing the number of characters');
        });
    });

    describe('Signature Help', () => {
        it('should provide signature help for built-in functions', () => {
            const text = 'Mid(';
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            // Position after '(' (char 4)
            const help = onSignatureHelp({ textDocument: { uri: document.uri }, position: Position.create(0, 4) }, document);

            expect(help).to.exist;
            expect(help!.signatures).to.have.lengthOf(1);
            expect(help!.signatures[0].label).to.contain('Mid(str, start, [length])');
            expect(help!.signatures[0].parameters).to.have.length.above(1);
        });
    });
});
