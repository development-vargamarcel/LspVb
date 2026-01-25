import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { validateTextDocument } from '../src/features/validation';

describe('Unused Variable Detection', () => {
    it('should report unused local variable', () => {
        const text = `
Sub MySub()
    Dim x As Integer
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const unused = diagnostics.find(d => d.message.includes("Variable 'x' is declared but never used"));
        expect(unused).to.exist;
        expect(unused?.severity).to.equal(DiagnosticSeverity.Information);
    });

    it('should NOT report used local variable', () => {
        const text = `
Sub MySub()
    Dim x As Integer
    x = 10
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const unused = diagnostics.find(d => d.message.includes("Variable 'x' is declared but never used"));
        expect(unused).to.not.exist;
    });

    it('should NOT report used local variable (read)', () => {
        const text = `
Sub MySub()
    Dim x As Integer
    Dim y = x
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const unused = diagnostics.find(d => d.message.includes("Variable 'x' is declared but never used"));
        expect(unused).to.not.exist;
    });

    it('should respect scope (ignore usage outside)', () => {
        // This is tricky. If usage is outside, it's invalid code (if local), but if it matches name...
        // My implementation checks usage within parent range.
        // If I use 'x' outside, it shouldn't count towards 'x' inside.

        const text = `
Sub MySub()
    Dim x As Integer
End Sub

Sub Other()
    ' usage of x here is technically invalid referencing the above x, but let's see if our logic catches it.
    ' If we only count inside MySub, x should be unused.
    Dim y = x
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const unused = diagnostics.find(d => d.message.includes("Variable 'x' is declared but never used"));
        expect(unused).to.exist;
    });

    it('should NOT report fields (only locals)', () => {
        const text = `
Class MyClass
    Public x As Integer
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const unused = diagnostics.find(d => d.message.includes("Variable 'x'"));
        expect(unused).to.not.exist;
    });
});
