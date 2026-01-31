import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction, CodeActionKind, Range } from 'vscode-languageserver/node';
import { onCodeAction } from '../src/features/codeAction';

describe('New Code Action Features', () => {
    it('should provide Generate ToString action', () => {
        const text = `
Class Person
    Public Name As String
    Private _age As Integer
    Public Property Age As Integer
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        // Cursor on "Class Person"
        const range = Range.create(1, 0, 1, 0);

        const params: any = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document);

        const action = actions.find((a: any) => a.title === 'Generate ToString');
        expect(action).to.exist;
        expect((action as CodeAction).kind).to.equal(CodeActionKind.Refactor);

        const edits = (action as CodeAction).edit!.changes![document.uri];
        expect(edits).to.have.lengthOf(1);

        const newText = edits[0].newText;
        expect(newText).to.contain('Public Overrides Function ToString() As String');
        expect(newText).to.contain('Return "Person [" & "Name=" & Name & ", " & "_age=" & _age & ", " & "Age=" & Age & "]"');
    });

    it('should NOT provide Generate ToString if already exists', () => {
        const text = `
Class Person
    Public Name As String
    Public Overrides Function ToString() As String
        Return ""
    End Function
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const range = Range.create(1, 0, 1, 0);

        const params: any = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document);

        const action = actions.find((a: any) => a.title === 'Generate ToString');
        expect(action).to.not.exist;
    });

    it('should provide Generate Equals and GetHashCode action', () => {
        const text = `
Class Person
    Public Name As String
    Public Property Age As Integer
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const range = Range.create(1, 0, 1, 0);

        const params: any = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document);

        const action = actions.find((a: any) => a.title === 'Generate Equals and GetHashCode');
        expect(action).to.exist;
        expect((action as CodeAction).kind).to.equal(CodeActionKind.Refactor);

        const edits = (action as CodeAction).edit!.changes![document.uri];
        expect(edits).to.have.lengthOf(1);

        const newText = edits[0].newText;
        expect(newText).to.contain('Public Overrides Function Equals(obj As Object) As Boolean');
        expect(newText).to.contain('Public Overrides Function GetHashCode() As Integer');
        expect(newText).to.contain('Me.Name = other.Name');
        expect(newText).to.contain('Me.Age.GetHashCode()');
    });

    it('should NOT provide Generate Equals/GetHashCode if one exists', () => {
        const text = `
Class Person
    Public Name As String
    Public Overrides Function Equals(obj As Object) As Boolean
        Return True
    End Function
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const range = Range.create(1, 0, 1, 0);

        const params: any = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document);

        const action = actions.find((a: any) => a.title === 'Generate Equals and GetHashCode');
        expect(action).to.not.exist;
    });
});
