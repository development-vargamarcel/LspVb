import { expect } from 'chai';
import { FoldingRangeParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onFoldingRanges } from '../src/features/folding';

describe('Folding Feature', () => {
    it('should fold Sub/End Sub blocks', () => {
        const content = `
Public Sub Main()
    ' Code
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: FoldingRangeParams = { textDocument: { uri: 'file:///test.vb' } };
        const ranges = onFoldingRanges(params, document);

        expect(ranges).to.have.lengthOf(1);
        expect(ranges[0].startLine).to.equal(1);
        expect(ranges[0].endLine).to.equal(2); // Folds up to line before End Sub?
        // Logic in folding.ts:
        // ranges.push({ startLine: start.line, endLine: i - 1 });
        // End Sub is at line 3. i=3. endLine = 2. Correct.
    });

    it('should fold If/End If blocks', () => {
        const content = `
If condition Then
    ' Code
End If
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: FoldingRangeParams = { textDocument: { uri: 'file:///test.vb' } };
        const ranges = onFoldingRanges(params, document);

        expect(ranges).to.have.lengthOf(1);
        expect(ranges[0].startLine).to.equal(1);
        expect(ranges[0].endLine).to.equal(2);
    });

    it('should fold For/Next blocks', () => {
        const content = `
For i = 1 To 10
    ' Code
Next
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: FoldingRangeParams = { textDocument: { uri: 'file:///test.vb' } };
        const ranges = onFoldingRanges(params, document);

        expect(ranges).to.have.lengthOf(1);
        expect(ranges[0].startLine).to.equal(1);
        expect(ranges[0].endLine).to.equal(2);
    });

    it('should fold Select Case/End Select blocks', () => {
        const content = `
Select Case x
    Case 1
        ' Code
End Select
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: FoldingRangeParams = { textDocument: { uri: 'file:///test.vb' } };
        const ranges = onFoldingRanges(params, document);

        expect(ranges).to.have.lengthOf(1);
        expect(ranges[0].startLine).to.equal(1);
        expect(ranges[0].endLine).to.equal(3);
    });
});
