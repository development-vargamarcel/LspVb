import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction, CodeActionKind, Range } from 'vscode-languageserver/node';
import { onCodeAction } from '../src/features/codeAction';

describe('Code Action: Generate Constructor', () => {
    it('should propose generating constructor for class with private fields', () => {
        const content = `
Class Person
    Private _name As String
    Private _age As Integer

    Public Sub SayHello()
    End Sub
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        // Cursor on Class definition
        const range = Range.create(1, 6, 1, 6); // "Person"

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        }, document);

        const action = actions.find(a => a.title.startsWith('Generate Constructor')) as CodeAction;
        expect(action).to.exist;
        expect(action.kind).to.equal(CodeActionKind.Refactor);

        const edit = action.edit!.changes![document.uri][0];
        const newText = edit.newText;

        // Expect Sub New with parameters
        expect(newText).to.contain('Public Sub New(name As String, age As Integer)');
        // Expect assignments
        expect(newText).to.contain('_name = name');
        expect(newText).to.contain('_age = age');
        expect(newText).to.contain('End Sub');
    });

    it('should NOT propose constructor if Sub New already exists', () => {
        const content = `
Class Person
    Private _name As String

    Public Sub New(name As String)
        _name = name
    End Sub
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(1, 6, 1, 6);

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        }, document);

        const action = actions.find(a => a.title.startsWith('Generate Constructor'));
        expect(action).to.not.exist;
    });

    it('should NOT propose constructor if no fields found', () => {
        const content = `
Class Person
    Public Sub SayHello()
    End Sub
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(1, 6, 1, 6);

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        }, document);

        const action = actions.find(a => a.title.startsWith('Generate Constructor'));
        expect(action).to.not.exist;
    });

    it('should handle Dim fields in Class', () => {
        const content = `
Class Person
    Dim _name As String
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(1, 6, 1, 6);

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        }, document);

        const action = actions.find(a => a.title.startsWith('Generate Constructor')) as CodeAction;
        expect(action).to.exist;
        expect(action.edit!.changes![document.uri][0].newText).to.contain('Public Sub New(name As String)');
    });
});
