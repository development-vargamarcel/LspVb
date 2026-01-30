import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateTextDocument } from '../src/features/validation';
import { DiagnosticSeverity } from 'vscode-languageserver/node';

describe('Validation: Empty Catch Block', () => {
    it('should detect empty catch block', () => {
        const content = `
Sub Test()
    Try
        Dim x = 1
    Catch ex As Exception
    End Try
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const diagnostics = validateTextDocument(document);

        const diagnostic = diagnostics.find(d => d.message === "Empty 'Catch' block detected.");
        expect(diagnostic).to.exist;
        expect(diagnostic!.severity).to.equal(DiagnosticSeverity.Information);
        expect(diagnostic!.range.start.line).to.equal(4); // Line with Catch
    });

    it('should detect catch block with only comments as empty', () => {
        const content = `
Sub Test()
    Try
        Dim x = 1
    Catch ex As Exception
        ' TODO: Handle error
    End Try
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const diagnostics = validateTextDocument(document);

        const diagnostic = diagnostics.find(d => d.message === "Empty 'Catch' block detected.");
        expect(diagnostic).to.exist;
    });

    it('should NOT report if catch block has content', () => {
        const content = `
Sub Test()
    Try
        Dim x = 1
    Catch ex As Exception
        Console.WriteLine(ex.Message)
    End Try
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const diagnostics = validateTextDocument(document);

        const diagnostic = diagnostics.find(d => d.message === "Empty 'Catch' block detected.");
        expect(diagnostic).to.not.exist;
    });
});
