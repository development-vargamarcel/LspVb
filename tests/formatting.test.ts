import { expect } from 'chai';
import { formatDocument } from '../src/features/formatting';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { FormattingOptions } from 'vscode-languageserver/node';

describe('Formatting Tests', () => {
    function format(content: string, options: FormattingOptions = { tabSize: 4, insertSpaces: true }): string {
        const document = TextDocument.create('uri', 'vb', 1, content);
        const edits = formatDocument(document, options);
        let lines = content.split(/\r?\n/);

        for (const edit of edits) {
            const lineIdx = edit.range.start.line;
            if (lineIdx < lines.length) {
                lines[lineIdx] = edit.newText;
            }
        }
        return lines.join('\n');
    }

    it('should indent Sub/End Sub', () => {
        const input = `
Sub Main()
Dim x
End Sub
`;
        const expected = `
Sub Main()
    Dim x
End Sub
`;
        expect(format(input)).to.equal(expected);
    });

    it('should indent nested If', () => {
        const input = `
Sub Main()
If x Then
If y Then
z = 1
End If
End If
End Sub
`;
        const expected = `
Sub Main()
    If x Then
        If y Then
            z = 1
        End If
    End If
End Sub
`;
        expect(format(input)).to.equal(expected);
    });

    it('should handle Else and ElseIf', () => {
        const input = `
If x Then
a = 1
ElseIf y Then
a = 2
Else
a = 3
End If
`;
        const expected = `
If x Then
    a = 1
ElseIf y Then
    a = 2
Else
    a = 3
End If
`;
        expect(format(input)).to.equal(expected);
    });

    it('should handle Select Case', () => {
        const input = `
Select Case x
Case 1
y = 1
Case 2
y = 2
End Select
`;
        const expected = `
Select Case x
    Case 1
        y = 1
    Case 2
        y = 2
End Select
`;
        expect(format(input)).to.equal(expected);
    });

    it('should handle nested Select Case', () => {
        const input = `
Select Case x
Case 1
Select Case y
Case A
z = 1
End Select
Case 2
z = 2
End Select
`;
        const expected = `
Select Case x
    Case 1
        Select Case y
            Case A
                z = 1
        End Select
    Case 2
        z = 2
End Select
`;
        expect(format(input)).to.equal(expected);
    });

    it('should handle Do Loop', () => {
        const input = `
Do
x = x + 1
Loop
`;
        const expected = `
Do
    x = x + 1
Loop
`;
        expect(format(input)).to.equal(expected);
    });

    it('should handle For Next', () => {
        const input = `
For i = 1 To 10
x = x + 1
Next
`;
        const expected = `
For i = 1 To 10
    x = x + 1
Next
`;
        expect(format(input)).to.equal(expected);
    });

    it('should handle bad indentation', () => {
         const input = `
  Sub Main()
    If x Then
  y = 1
      End If
   End Sub
`;
        const expected = `
Sub Main()
    If x Then
        y = 1
    End If
End Sub
`;
        expect(format(input)).to.equal(expected);
    });

    it('should format Else block correctly with misalignment', () => {
        const input = `
Sub Main()
    If True Then
        x = 1
      Else
        x = 2
    End If
End Sub
`;
        const expected = `
Sub Main()
    If True Then
        x = 1
    Else
        x = 2
    End If
End Sub
`;
        expect(format(input)).to.equal(expected);
    });
});
