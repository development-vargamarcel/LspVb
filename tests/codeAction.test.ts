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

    it('should provide code action to remove unused variable', () => {
        const text = `
Sub MySub()
    Dim x As Integer
    x = 1
    Dim unused As String
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);

        // Mock diagnostic
        const diagnostic: Diagnostic = {
            message: "Variable 'unused' is declared but never used.",
            range: Range.create(4, 8, 4, 14), // "unused"
            severity: DiagnosticSeverity.Information,
            source: 'SimpleVB'
        };

        const params: any = {
            textDocument: { uri: 'file:///test.vb' },
            range: diagnostic.range,
            context: { diagnostics: [diagnostic] }
        };

        const actions = onCodeAction(params, document);

        const removeAction = actions.find((a: any) => a.title === 'Remove unused variable');
        expect(removeAction).to.exist;
        expect((removeAction as CodeAction).kind).to.equal(CodeActionKind.QuickFix);

        const edits = (removeAction as CodeAction).edit!.changes!['file:///test.vb'];
        expect(edits).to.have.lengthOf(1);
        // Expect deletion of line 4
        expect(edits[0].range.start.line).to.equal(4);
        expect(edits[0].range.start.character).to.equal(0);
        expect(edits[0].range.end.line).to.equal(5);
        expect(edits[0].range.end.character).to.equal(0);
    });

    it('should NOT provide code action to remove unused variable if line has side effects', () => {
        const text = `
Sub MySub()
    Dim x = CallFunction()
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);

        const diagnostic: Diagnostic = {
            message: "Variable 'x' is declared but never used.",
            range: Range.create(2, 8, 2, 9),
            severity: DiagnosticSeverity.Information,
            source: 'SimpleVB'
        };

        const params: any = {
            textDocument: { uri: 'file:///test.vb' },
            range: diagnostic.range,
            context: { diagnostics: [diagnostic] }
        };

        const actions = onCodeAction(params, document);

        const removeAction = actions.find((a: any) => a.title === 'Remove unused variable');
        expect(removeAction).to.not.exist;
    });

    it('should NOT provide code action to remove unused variable if multiple declarations on line', () => {
        const text = `
Sub MySub()
    Dim x, y As Integer
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);

        const diagnostic: Diagnostic = {
            message: "Variable 'x' is declared but never used.",
            range: Range.create(2, 8, 2, 9),
            severity: DiagnosticSeverity.Information,
            source: 'SimpleVB'
        };

        const params: any = {
            textDocument: { uri: 'file:///test.vb' },
            range: diagnostic.range,
            context: { diagnostics: [diagnostic] }
        };

        const actions = onCodeAction(params, document);

        const removeAction = actions.find((a: any) => a.title === 'Remove unused variable');
        expect(removeAction).to.not.exist;
    });

    it('should provide extract constant action for magic number', () => {
        const text = `
Sub Main()
    x = 100
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);

        // Mock diagnostic produced by validation (Magic Number 100)
        // Line 2: "    x = 100"
        // 100 starts at char 8
        const range = Range.create(2, 8, 2, 11);
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Information,
            range: range,
            message: 'Avoid magic numbers (100). Use a Constant instead.',
            source: 'SimpleVB'
        };

        const params: any = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [diagnostic] }
        };

        const actions = onCodeAction(params, document);

        const extractAction = actions.find((a: any) => a.title === 'Extract to Constant');
        expect(extractAction).to.exist;
        expect((extractAction as CodeAction).kind).to.equal(CodeActionKind.RefactorExtract);

        const changes = (extractAction as CodeAction).edit!.changes![document.uri];
        expect(changes).to.have.lengthOf(2);

        // 1. Insert Const
        const insertEdit = changes.find(c => c.newText.includes('Const '));
        expect(insertEdit).to.exist;
        expect(insertEdit!.newText).to.contain('Const CONST_100 = 100');

        // 2. Replace 100 with CONST_100
        const replaceEdit = changes.find(c => c.newText === 'CONST_100');
        expect(replaceEdit).to.exist;
        expect(replaceEdit!.range).to.deep.equal(range);
    });
});
