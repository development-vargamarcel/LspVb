import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeAction, CodeActionKind, Range, TextEdit } from 'vscode-languageserver/node';
import { onCodeAction } from '../src/features/codeAction';

describe('Code Action: Wrap in Try/Catch', () => {

    it('should provide wrap action for valid selection', () => {
        const content = `
Sub Main()
    Dim x = 1
    Dim y = 2
End Sub`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        // Select lines 3 and 4 (Dim x = 1, Dim y = 2)
        // Line indices are 0-based.
        // Line 0: empty
        // Line 1: Sub Main()
        // Line 2:     Dim x = 1
        // Line 3:     Dim y = 2
        // Line 4: End Sub

        const range = Range.create(2, 4, 3, 13); // Select inside indentation

        const params: any = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document);

        const wrapAction = actions.find((a: any) => a.title === 'Wrap in Try...Catch');
        expect(wrapAction).to.exist;
        expect((wrapAction as CodeAction).kind).to.equal(CodeActionKind.RefactorRewrite);

        const edits = (wrapAction as CodeAction).edit!.changes![document.uri];
        expect(edits).to.have.lengthOf(1);

        // Check new text content
        const newText = edits[0].newText;
        expect(newText).to.contain('Try');
        expect(newText).to.contain('Catch ex As Exception');
        expect(newText).to.contain('End Try');

        // Check indentation
        // Original indentation was 4 spaces.
        // Try should be at 4 spaces.
        // Inner content should be at 8 spaces.
        expect(newText).to.contain('    Try');
        expect(newText).to.contain('        Dim x = 1');
        expect(newText).to.contain('        Dim y = 2');
    });

    it('should NOT provide wrap action for empty selection (cursor only)', () => {
        const content = `Sub Main()\n    Dim x = 1\nEnd Sub`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(1, 4, 1, 4); // Cursor at start of Dim x = 1

        const params: any = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document);

        const wrapAction = actions.find((a: any) => a.title === 'Wrap in Try...Catch');
        expect(wrapAction).to.not.exist;
    });

    it('should handle indentation correctly (tabs)', () => {
        const content = "Sub Main()\n\tDim x = 1\nEnd Sub";
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const range = Range.create(1, 1, 1, 10);

        const params: any = {
            textDocument: { uri: document.uri },
            range: range,
            context: { diagnostics: [] }
        };

        const actions = onCodeAction(params, document);
        const wrapAction = actions.find((a: any) => a.title === 'Wrap in Try...Catch');
        expect(wrapAction).to.exist;

        const newText = (wrapAction as CodeAction).edit!.changes![document.uri][0].newText;
        expect(newText).to.contain('\tTry');
        expect(newText).to.contain('\t\tDim x = 1');
    });
});
