import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity, FoldingRange, Diagnostic } from 'vscode-languageserver/node';
import { validateTextDocument } from '../src/features/validation';
import { onFoldingRanges } from '../src/features/folding';

describe('New Features', () => {

    describe('Comment Folding', () => {
        it('should fold consecutive comment lines', () => {
            const text = `
' Header Comment
' Line 2
' Line 3
Sub Main()
End Sub
' Single comment
Dim x
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const ranges = onFoldingRanges({ textDocument: { uri: document.uri } }, document);

            // Should find one range for lines 1-3 (0-indexed: lines 1,2,3 in file string above?
            // The template string has a newline at start.
            // Line 0: empty
            // Line 1: ' Header
            // Line 2: ' Line 2
            // Line 3: ' Line 3
            // Line 4: Sub...

            // Expect range 1-3
            const commentRange = ranges.find(r => r.startLine === 1 && r.endLine === 3);
            expect(commentRange).to.exist;
            expect(commentRange!.kind).to.equal('comment');
        });

        it('should NOT fold single comment lines', () => {
            const text = `
' Single
Sub Main()
End Sub
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const ranges = onFoldingRanges({ textDocument: { uri: document.uri } }, document);

            const commentRange = ranges.find(r => r.startLine === 1);
            expect(commentRange).to.not.exist;
        });

        it('should fold comment block at EOF', () => {
            const text = `
Sub Main()
End Sub
' EOF Comment 1
' EOF Comment 2
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const ranges = onFoldingRanges({ textDocument: { uri: document.uri } }, document);

            // Lines: 0 (empty), 1 Sub, 2 End Sub, 3 ' EOF 1, 4 ' EOF 2
            const range = ranges.find(r => r.startLine === 3 && r.endLine === 4);
            expect(range).to.exist;
        });
    });

    describe('TODO Diagnostics', () => {
        it('should detect TODO comments', () => {
            const text = `
' TODO: Fix this
Sub Main()
End Sub
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const todo = diagnostics.find(d => d.message.includes('TODO: Fix this'));
            expect(todo).to.exist;
            expect(todo!.severity).to.equal(DiagnosticSeverity.Information);
        });

        it('should detect FIXME comments', () => {
             const text = `
' FIXME: Broken logic
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const fixme = diagnostics.find(d => d.message.includes('FIXME: Broken logic'));
            expect(fixme).to.exist;
            expect(fixme!.severity).to.equal(DiagnosticSeverity.Information);
        });
    });

    describe('Missing Return Type Validation', () => {
        it('should warn on Function without As clause', () => {
            const text = `
Function MyFunc(x)
End Function
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const warning = diagnostics.find(d => d.message.includes("Function 'MyFunc' is missing a return type"));
            expect(warning).to.exist;
            expect(warning!.severity).to.equal(DiagnosticSeverity.Warning);
        });

        it('should warn on Property without As clause', () => {
            const text = `
Property MyProp()
End Property
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const warning = diagnostics.find(d => d.message.includes("Property 'MyProp' is missing a return type"));
            expect(warning).to.exist;
            expect(warning!.severity).to.equal(DiagnosticSeverity.Warning);
        });

        it('should NOT warn if As clause is present', () => {
            const text = `
Function MyFunc() As Integer
End Function
Property MyProp() As String
End Property
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const warnings = diagnostics.filter(d => d.message.includes("missing a return type") || d.message.includes("missing a type"));
            expect(warnings).to.be.empty;
        });

        it('should NOT warn on multiline Function definition', () => {
            const text = `
Function MyFunc( _
    args _
)
End Function
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            // The validator currently skips validation for lines ending with _
            // So it shouldn't warn "missing return type" on the first line "Function MyFunc( _"

            const warning = diagnostics.find(d => d.message.includes("missing a return type"));
            expect(warning).to.not.exist;
        });
    });
});
