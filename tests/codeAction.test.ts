import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction, CodeActionKind, Diagnostic, DiagnosticSeverity, Range, TextEdit } from 'vscode-languageserver/node';
import { onCodeAction } from '../src/features/codeAction';

describe('Code Action Feature', () => {
    function createDiagnostic(message: string, range: Range): Diagnostic {
        return {
            message,
            range,
            severity: DiagnosticSeverity.Error,
            source: 'SimpleVB'
        };
    }

    it('should provide code action for missing Then', () => {
        const content = 'If x = 1';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(0, 0, 0, content.length);
        const diagnostic = createDiagnostic("Missing 'Then' in If statement.", range);

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [diagnostic] }
        }, document);

        expect(actions).to.have.lengthOf(1);
        const action = actions[0] as CodeAction;
        expect(action.title).to.equal("Add 'Then'");
        expect(action.kind).to.equal(CodeActionKind.QuickFix);

        const edits = action.edit!.changes![document.uri];
        expect(edits).to.have.lengthOf(1);
        expect(edits[0].newText).to.equal(" Then");
    });

    it('should provide code action for missing Then with comment', () => {
        const content = "If x = 1 ' comment";
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(0, 0, 0, content.length);
        const diagnostic = createDiagnostic("Missing 'Then' in If statement.", range);

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [diagnostic] }
        }, document);

        expect(actions).to.have.lengthOf(1);
        const action = actions[0] as CodeAction;

        const edits = action.edit!.changes![document.uri];
        // "If x = 1 ' comment" -> index of ' is 9.
        // We want insert before '
        expect(edits[0].range.start.character).to.equal(9);
        // It detects the space before ' so it only inserts "Then "
        expect(edits[0].newText).to.equal("Then ");
    });

    it('should provide code action for missing As', () => {
        const content = 'Dim x';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(0, 0, 0, content.length);
        const diagnostic = createDiagnostic("Variable declaration without type (As ...).", range);

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [diagnostic] }
        }, document);

        expect(actions).to.have.lengthOf(1);
        const action = actions[0] as CodeAction;
        expect(action.title).to.equal("Add 'As Object'");

        const edits = action.edit!.changes![document.uri];
        expect(edits[0].newText).to.equal(" As Object");
    });

    it('should provide code action for missing Const value', () => {
        const content = 'Const x';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(0, 0, 0, content.length);
        const diagnostic = createDiagnostic("Const declaration requires a value (e.g. Const x = 1).", range);

        const actions = onCodeAction({
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [diagnostic] }
        }, document);

        expect(actions).to.have.lengthOf(1);
        const action = actions[0] as CodeAction;
        expect(action.title).to.equal("Initialize with 0");

        const edits = action.edit!.changes![document.uri];
        expect(edits[0].newText).to.equal(" = 0");
    });
});
