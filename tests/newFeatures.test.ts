import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction, CodeActionKind, Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver/node';
import { onCodeAction } from '../src/features/codeAction';

describe('New Features: Encapsulate Field and Add Imports', () => {
    function createDiagnostic(message: string, range: Range): Diagnostic {
        return {
            message,
            range,
            severity: DiagnosticSeverity.Error,
            source: 'SimpleVB'
        };
    }

    it('should suggest Add Imports for List', () => {
        const content = 'Dim x As List(Of String)';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(0, 9, 0, 13); // "List"
        const diagnostic = createDiagnostic("Type 'List(Of String)' is not defined.", range);

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [diagnostic] }
        }, document);

        const action = actions.find(a => a.title === "Import 'System.Collections.Generic'") as CodeAction;
        expect(action).to.exist;
        expect(action.kind).to.equal(CodeActionKind.QuickFix);

        const edits = action.edit!.changes![document.uri];
        expect(edits).to.have.lengthOf(1);
        expect(edits[0].newText).to.equal("Imports System.Collections.Generic\n");
        expect(edits[0].range.start).to.deep.equal({ line: 0, character: 0 });
    });

    it('should suggest Encapsulate Field for private field', () => {
        const content = 'Private _count As Integer';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(0, 0, 0, content.length); // Full line selection (or cursor in line)

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        }, document);

        const action = actions.find(a => a.title === "Encapsulate Field: Generate Property 'Count'") as CodeAction;
        expect(action).to.exist;
        expect(action.kind).to.equal(CodeActionKind.Refactor);

        const edits = action.edit!.changes![document.uri];
        expect(edits).to.have.lengthOf(1);

        const newText = edits[0].newText;
        expect(newText).to.contain('Public Property Count As Integer');
        expect(newText).to.contain('Return _count');
        expect(newText).to.contain('_count = value');
    });

    it('should suggest Encapsulate Field for Dim _var', () => {
        const content = 'Dim _name As String';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(0, 0, 0, 0); // Cursor at start

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        }, document);

        const action = actions.find(a => a.title === "Encapsulate Field: Generate Property 'Name'") as CodeAction;
        expect(action).to.exist;

        const edits = action.edit!.changes![document.uri];
        expect(edits[0].newText).to.contain('Public Property Name As String');
    });
});
