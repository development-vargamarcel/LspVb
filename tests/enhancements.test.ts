import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols, findSymbolAtPosition } from '../src/utils/parser';
import { formatDocument } from '../src/features/formatting';
import { onCodeAction } from '../src/features/codeAction';
import { KEYWORDS } from '../src/keywords';
import { Diagnostic, DiagnosticSeverity, Range, CodeActionKind } from 'vscode-languageserver/node';

describe('Enhancements', () => {
    describe('Argument Parsing', () => {
        it('should find function arguments as symbols', () => {
            const text = `
Function MyFunc(arg1 As Integer, arg2 As String)
    Dim x As Integer
End Function
`;
            const doc = TextDocument.create('uri', 'vb', 1, text);
            const symbols = parseDocumentSymbols(doc);

            // Check if arguments are in children of Function
            const func = symbols.find(s => s.name === 'MyFunc');
            expect(func).to.exist;

            const arg1 = func!.children!.find(c => c.name === 'arg1');
            expect(arg1, 'Argument arg1 should be a child symbol').to.exist;

            const arg2 = func!.children!.find(c => c.name === 'arg2');
            expect(arg2, 'Argument arg2 should be a child symbol').to.exist;
        });
    });

    describe('Keyword Casing', () => {
        it('should format keyword casing', () => {
            const text = 'dim x as integer';
            const doc = TextDocument.create('uri', 'vb', 1, text);
            // Mock options
            const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true });

            // We expect edits to change 'dim' to 'Dim', 'as' to 'As', 'integer' to 'Integer'
            // The current formatter only does spacing and indentation.
            // If this fails, it means casing is not implemented.

            // Apply edits (simplified)
            let newText = text;
            // Edits are reverse ordered usually, but here we just check if we get edits replacing text
            // If we get no edits or edits that don't fix casing, then it fails.

            // Ideally we check specific edits.
            const casingEdit = edits.find(e => e.newText.includes('Dim'));
            expect(casingEdit, 'Should have edit for "dim" -> "Dim"').to.exist;
        });
    });

    describe('Code Actions', () => {
        it('should suggest adding missing closing statement', () => {
            const text = `
If x = 1 Then
    x = 2
`; // Missing End If
            const doc = TextDocument.create('uri', 'vb', 1, text);

            const diagnostic: Diagnostic = {
                message: "Missing closing statement for 'If' block started at line 2.",
                range: Range.create(1, 0, 1, 10),
                severity: DiagnosticSeverity.Error,
                source: 'SimpleVB'
            };

            const params: any = {
                context: { diagnostics: [diagnostic] },
                textDocument: { uri: 'uri' },
                range: diagnostic.range
            };

            const actions = onCodeAction(params, doc);
            const closeAction = actions.find((a: any) => a.title.includes("Add 'End If'"));
            expect(closeAction, 'Should suggest adding "End If"').to.exist;
        });
    });
});
