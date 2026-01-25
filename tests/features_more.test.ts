import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver/node';
import { validateTextDocument } from '../src/features/validation';

describe('More New Features', () => {

    describe('Max Line Length', () => {
        it('should warn on long lines', () => {
            const longLine = "' " + "a".repeat(120); // 2 + 120 = 122 chars
            const text = `
Sub Main()
    ${longLine}
End Sub
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const warning = diagnostics.find(d => d.message.includes('Line is too long'));
            expect(warning).to.exist;
            expect(warning!.severity).to.equal(DiagnosticSeverity.Warning);
        });
    });

    describe('Variable Naming Convention', () => {
        it('should info on PascalCase local variable', () => {
            const text = `
Sub Main()
    Dim MyVar As Integer
End Sub
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const info = diagnostics.find(d => d.message.includes('Local variables should be camelCase'));
            expect(info).to.exist;
            expect(info!.severity).to.equal(DiagnosticSeverity.Information);
        });

        it('should NOT info on camelCase local variable', () => {
            const text = `
Sub Main()
    Dim myVar As Integer
End Sub
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const info = diagnostics.find(d => d.message.includes('Local variables should be camelCase'));
            expect(info).to.not.exist;
        });
    });

    describe('Magic Number Detection', () => {
        it('should info on magic numbers', () => {
            const text = `
Sub Main()
    x = 42
End Sub
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const info = diagnostics.find(d => d.message.includes('Avoid magic numbers'));
            expect(info).to.exist;
            expect(info!.severity).to.equal(DiagnosticSeverity.Information);
        });

        it('should NOT info on 0, 1', () => {
            const text = `
Sub Main()
    Dim x = 0
    Dim y = 1
End Sub
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const info = diagnostics.find(d => d.message.includes('Avoid magic numbers'));
            expect(info).to.not.exist;
        });

        it('should NOT info on Const definitions', () => {
            const text = `
Const MAX_VAL = 100
            `;
            const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
            const diagnostics = validateTextDocument(document);

            const info = diagnostics.find(d => d.message.includes('Avoid magic numbers'));
            expect(info).to.not.exist;
        });
    });
});
