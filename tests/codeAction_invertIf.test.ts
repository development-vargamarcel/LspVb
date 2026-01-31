import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction, CodeActionKind, CodeActionParams, Range, TextEdit } from 'vscode-languageserver/node';
import { onCodeAction } from '../src/features/codeAction';

describe('Code Action Feature - Invert If', () => {
    function createDoc(content: string): TextDocument {
        return TextDocument.create('file:///test.vb', 'vb', 1, content);
    }

    it('should propose "Invert If" when cursor is on "If" keyword', () => {
        const content = `
Sub Test()
    If x > 0 Then
        DoSomething()
    Else
        DoSomethingElse()
    End If
End Sub`;
        const document = createDoc(content);
        // Cursor on "If" (Line 2)
        const range = Range.create(2, 4, 2, 4);

        const params: CodeActionParams = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document) as CodeAction[];
        const invertAction = actions.find(a => a.title === 'Invert If');

        expect(invertAction).to.not.be.undefined;
        expect(invertAction?.kind).to.equal(CodeActionKind.RefactorRewrite);
    });

    it('should correctly invert an If/Else block', () => {
        const content = `
Sub Test()
    If x > 0 Then
        DoSomething()
    Else
        DoSomethingElse()
    End If
End Sub`;
        const document = createDoc(content);
        const range = Range.create(2, 4, 2, 4);

        const params: CodeActionParams = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document) as CodeAction[];
        const invertAction = actions.find(a => a.title === 'Invert If');

        const edit = invertAction?.edit?.changes?.[document.uri][0] as TextEdit;
        const newText = edit.newText;

        // Expect negated condition and swapped blocks
        // Indentation should be preserved
        // x > 0 -> x <= 0
        expect(newText).to.contain('If x <= 0 Then');
        expect(newText).to.contain('DoSomethingElse()'); // Now in Then block (first)
        expect(newText).to.contain('Else');
        expect(newText).to.contain('DoSomething()'); // Now in Else block (second)
    });

    it('should correctly invert an If block without Else', () => {
        const content = `
Sub Test()
    If x = 1 Then
        DoSomething()
    End If
End Sub`;
        const document = createDoc(content);
        const range = Range.create(2, 4, 2, 4);

        const params: CodeActionParams = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document) as CodeAction[];
        const invertAction = actions.find(a => a.title === 'Invert If');

        expect(invertAction).to.not.be.undefined;

        const edit = invertAction?.edit?.changes?.[document.uri][0] as TextEdit;
        const newText = edit.newText;

        // x = 1 -> x <> 1
        expect(newText).to.contain('If x <> 1 Then');
        expect(newText).to.contain('Else');
        expect(newText).to.contain('DoSomething()'); // Moved to Else block
        // Then block should be empty (or just newline)
        // Check structure
        const lines = newText.split('\n');
        expect(lines[0].trim()).to.equal('If x <> 1 Then');
        // line[1] is empty (original Else block)
        expect(lines[1].trim()).to.equal('');
        expect(lines[2].trim()).to.equal('Else');
        expect(lines[3].trim()).to.equal('DoSomething()');
    });

    it('should NOT propose "Invert If" if ElseIf is present', () => {
        const content = `
Sub Test()
    If x > 0 Then
        DoSomething()
    ElseIf x < 0 Then
        DoSomethingElse()
    Else
        DoNothing()
    End If
End Sub`;
        const document = createDoc(content);
        const range = Range.create(2, 4, 2, 4);

        const params: CodeActionParams = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document) as CodeAction[];
        const invertAction = actions.find(a => a.title === 'Invert If');

        expect(invertAction).to.be.undefined;
    });

    it('should negate complex conditions with Not (...)', () => {
        const content = `
Sub Test()
    If (x > 0 And y < 1) Then
        DoSomething()
    End If
End Sub`;
        const document = createDoc(content);
        const range = Range.create(2, 4, 2, 4);

        const params: CodeActionParams = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document) as CodeAction[];
        const invertAction = actions.find(a => a.title === 'Invert If');
        const edit = invertAction?.edit?.changes?.[document.uri][0] as TextEdit;

        // (x > 0 And y < 1) -> Not ((x > 0 And y < 1)) or similar
        // Since our negation logic wraps in Not(...) if it's not a simple single operator
        // Updated logic avoids double parens if already present
        expect(edit.newText).to.contain('If Not (x > 0 And y < 1) Then');
    });

    it('should handle "Is" operator negation', () => {
        const content = `
Sub Test()
    If x Is Nothing Then
        Return
    End If
End Sub`;
        const document = createDoc(content);
        const range = Range.create(2, 4, 2, 4);

        const params: CodeActionParams = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document) as CodeAction[];
        const invertAction = actions.find(a => a.title === 'Invert If');
        const edit = invertAction?.edit?.changes?.[document.uri][0] as TextEdit;

        // Is -> IsNot
        expect(edit.newText).to.contain('If x IsNot Nothing Then');
    });

    it('should ignore comments on the If line', () => {
        const content = `
Sub Test()
    If x = 1 Then ' comment with Then keyword
        DoSomething()
    End If
End Sub`;
        const document = createDoc(content);
        const range = Range.create(2, 4, 2, 4);

        const params: CodeActionParams = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document) as CodeAction[];
        const invertAction = actions.find(a => a.title === 'Invert If');
        const edit = invertAction?.edit?.changes?.[document.uri][0] as TextEdit;

        // Should negate "x = 1" -> "x <> 1"
        // Should NOT include comment in condition or fail
        expect(edit.newText).to.contain('If x <> 1 Then');
    });

    it('should correctly handle unbalanced lookalike parens like "Not (A) Or (B)"', () => {
        const content = `
Sub Test()
    If Not (A) Or (B) Then
        DoSomething()
    End If
End Sub`;
        const document = createDoc(content);
        const range = Range.create(2, 4, 2, 4);

        const params: CodeActionParams = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document) as CodeAction[];
        const invertAction = actions.find(a => a.title === 'Invert If');
        const edit = invertAction?.edit?.changes?.[document.uri][0] as TextEdit;

        // "Not (A) Or (B)"
        // It contains "Or", so it enters logic block.
        // It checks hasBalancedOuterParens. "Not (A) Or (B)" starts with N, so no.
        // It returns "Not (Not (A) Or (B))"
        // Wait, my logic checks for "Not " prefix first.
        // lower.startsWith('not ') -> Yes.
        // inner = "(A) Or (B)".
        // hasBalancedOuterParens("(A) Or (B)") -> Should be FALSE.
        // So it falls through to logic operators check.
        // Wraps in Not(...). "Not (Not (A) Or (B))".

        // Wait, if input is "Not (A) Or (B)", negation is "(A) Or (B)"?
        // No, negation of "Not X" is "X".
        // But "Not (A) Or (B)" is "(Not (A)) Or (B)" (precedence).
        // Negation is "Not ((Not (A)) Or (B))".

        // Only if the whole expression is "Not (...)" can we unwrap.
        // "Not (A Or B)" -> "A Or B".

        // My test case string: "Not (A) Or (B)".
        // This is ambiguous in VB without precedence rules, but usually Not binds tighter than Or?
        // Yes, Unary Not > And/Or.
        // So "Not (A) Or (B)" means "(Not A) Or B".
        // Negation is "Not ((Not A) Or B)".

        // My code returns "Not (Not (A) Or (B))".

        expect(edit.newText).to.contain('If Not (Not (A) Or (B)) Then');
    });

    it('should unwrap "Not (...)" correctly', () => {
        const content = `
Sub Test()
    If Not (x = 1 And y = 2) Then
        DoSomething()
    End If
End Sub`;
        const document = createDoc(content);
        const range = Range.create(2, 4, 2, 4);

        const params: CodeActionParams = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document) as CodeAction[];
        const invertAction = actions.find(a => a.title === 'Invert If');
        const edit = invertAction?.edit?.changes?.[document.uri][0] as TextEdit;

        // "Not (x = 1 And y = 2)"
        // Starts with Not. Inner = "(x = 1 And y = 2)".
        // hasBalancedOuterParens -> True.
        // Returns "x = 1 And y = 2".

        expect(edit.newText).to.contain('If x = 1 And y = 2 Then');
    });
});
