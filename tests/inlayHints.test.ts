import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { InlayHintKind } from 'vscode-languageserver/node';
import { onInlayHints } from '../src/features/inlayHints';

describe('Inlay Hints Feature', () => {
    it('should provide hints for parameters', () => {
        const content = `
Sub MySub(x As Integer, y As String)
End Sub

Sub Main()
    MySub(10, "test")
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: any = {
            textDocument: { uri: document.uri },
            range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } }
        };

        const hints = onInlayHints(params, document);

        expect(hints).to.have.lengthOf(2);

        // 1st hint: "x:" at call
        expect(hints[0].label).to.equal('x:');
        expect(hints[0].kind).to.equal(InlayHintKind.Parameter);

        // 2nd hint: "y:"
        expect(hints[1].label).to.equal('y:');
        expect(hints[1].kind).to.equal(InlayHintKind.Parameter);
    });

    it('should match parameters correctly', () => {
        const content = `
Function Add(a As Integer, b As Integer) As Integer
    Return a + b
End Function

Sub Main()
    Dim res = Add(1, 2)
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: any = { textDocument: { uri: document.uri }, range: {} }; // range ignored in simple implementation

        const hints = onInlayHints(params, document);

        expect(hints).to.have.lengthOf(2);
        expect(hints[0].label).to.equal('a:');
        expect(hints[1].label).to.equal('b:');
    });

    it('should handle strings with commas', () => {
        const content = `
Sub Log(msg As String, code As Integer)
End Sub

Sub Main()
    Log("Error, occurred", 404)
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: any = { textDocument: { uri: document.uri }, range: {} };

        const hints = onInlayHints(params, document);

        expect(hints).to.have.lengthOf(2);
        expect(hints[0].label).to.equal('msg:');
        expect(hints[1].label).to.equal('code:');
    });

    it('should ignore characters in comments', () => {
        const content = `
Sub MyFunc(a As Integer)
End Sub

Sub Main()
    MyFunc(1) ' comment with )
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: any = { textDocument: { uri: document.uri }, range: {} };

        const hints = onInlayHints(params, document);

        expect(hints).to.have.lengthOf(1);
        expect(hints[0].label).to.equal('a:');
    });
});
