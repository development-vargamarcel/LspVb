import { expect } from 'chai';
import { validateTextDocument } from '../src/features/validation';
import { TextDocument } from 'vscode-languageserver-textdocument';

function createDoc(content: string): TextDocument {
    return TextDocument.create('test://test.vb', 'vb', 1, content);
}

describe('Validation Tests', () => {
    it('should detect missing End Sub', () => {
        const doc = createDoc(`
Sub Test()
    Dim x As Integer
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.have.lengthOf(1);
        expect(diagnostics[0].message).to.contain('Missing closing statement');
    });

    it('should detect missing Then in If', () => {
        const doc = createDoc(`
Sub Test()
    If x = 1
        x = 2
    End If
End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics.some(d => d.message.includes("Missing 'Then'"))).to.be.true;
    });

    it('should detect Dim without As', () => {
        const doc = createDoc(`
Sub Test()
    Dim x
End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics.some(d => d.message.includes("Variable declaration without type"))).to.be.true;
    });

    it('should not report error for valid If...Then', () => {
        const doc = createDoc(`
Sub Test()
    If x = 1 Then
        x = 2
    End If
End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.have.lengthOf(0);
    });

    it('should not report error for valid Single Line If', () => {
        const doc = createDoc(`
Sub Test()
    If x = 1 Then x = 2
End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.have.lengthOf(0);
    });

    it('should detect mismatched blocks', () => {
        const doc = createDoc(`
Sub Test()
    If x = 1 Then
    End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.not.be.empty;
        expect(diagnostics[0].message).to.contain('Mismatched block');
    });

    it('should handle nested blocks correctly', () => {
        const doc = createDoc(`
Sub Test()
    If x = 1 Then
        For i = 1 To 10
            x = x + 1
        Next
    End If
End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.have.lengthOf(0);
    });

    it('should handle Select Case blocks', () => {
        const doc = createDoc(`
Sub Test()
    Select Case x
        Case 1
            x = 2
        Case Else
            x = 3
    End Select
End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.have.lengthOf(0);
    });

    it('should handle Do Loop blocks', () => {
        const doc = createDoc(`
Sub Test()
    Do
        x = x + 1
    Loop
End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.have.lengthOf(0);
    });

    it('should ignore comments in validation', () => {
        const doc = createDoc(`
Sub Test() ' Start of Sub
    If x = 1 Then ' check condition
        x = 2
    End If ' end if
End Sub ' End of Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.have.lengthOf(0);
    });

    it('should handle While Wend blocks', () => {
        const doc = createDoc(`
Sub Test()
    While x < 10
        x = x + 1
    Wend
End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.have.lengthOf(0);
    });

    it('should detect unclosed nested block', () => {
        const doc = createDoc(`
Sub Test()
    If x = 1 Then
        For i = 1 To 10
            x = x + 1
    End If
End Sub
`);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics).to.not.be.empty;
        // It should complain about Next missing or mismatched End If
        expect(diagnostics[0].message).to.contain('Mismatched block');
    });
});
