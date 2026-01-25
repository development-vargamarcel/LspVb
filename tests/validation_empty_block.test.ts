import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver/node';
import { validateTextDocument } from '../src/features/validation';

describe('Validation Feature - Empty Block', () => {
    it('should warn on empty If block', () => {
        const text = `
Sub MySub()
    If True Then
    End If
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const emptyWarning = diagnostics.find(d => d.message.includes("Empty 'If' block detected"));
        expect(emptyWarning).to.exist;
        expect(emptyWarning!.severity).to.equal(DiagnosticSeverity.Warning);
    });

    it('should NOT warn on If block with content', () => {
        const text = `
Sub MySub()
    If True Then
        Dim x = 1
    End If
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const emptyWarning = diagnostics.find(d => d.message.includes("Empty 'If' block detected"));
        expect(emptyWarning).to.not.exist;
    });

    it('should NOT warn on If block with Else', () => {
        const text = `
Sub MySub()
    If True Then
    Else
        Dim x = 1
    End If
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        // Even though If content is empty, Else acts as "content" inside the block structure
        // because we treat any non-structure line as content, or Else as content.
        // My implementation marks content on !isStructure.
        // Else is NOT a Start/End structure (handleBlockStart returns false).
        // So Else triggers markCurrentContent.

        const emptyWarning = diagnostics.find(d => d.message.includes("Empty 'If' block detected"));
        expect(emptyWarning).to.not.exist;
    });

    it('should warn on empty For loop', () => {
        const text = `
Sub MySub()
    For i = 1 To 10
    Next
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const warning = diagnostics.find(d => d.message.includes("Empty 'For' block detected"));
        expect(warning).to.exist;
    });

    it('should NOT warn on empty Sub', () => {
        const text = `
Sub MySub()
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const diagnostics = validateTextDocument(document);

        const warning = diagnostics.find(d => d.message.includes("Empty 'Sub' block detected"));
        expect(warning).to.not.exist;
    });
});
