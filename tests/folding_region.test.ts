import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onFoldingRanges } from '../src/features/folding';

describe('Folding Feature - Regions', () => {
    it('should fold #Region blocks', () => {
        const text = `
#Region "My Region"
    ' code
#End Region
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const ranges = onFoldingRanges({ textDocument: { uri: document.uri } }, document);

        expect(ranges).to.have.lengthOf(1);
        expect(ranges[0].startLine).to.equal(1);
        expect(ranges[0].endLine).to.equal(2);
    });

    it('should handle nested #Region blocks', () => {
        const text = `
#Region "Outer"
    #Region "Inner"
        ' code
    #End Region
#End Region
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const ranges = onFoldingRanges({ textDocument: { uri: document.uri } }, document);

        // Expect 2 ranges
        expect(ranges).to.have.lengthOf(2);

        // Inner region
        const inner = ranges.find(r => r.startLine === 2);
        expect(inner).to.exist;
        expect(inner?.endLine).to.equal(3);

        // Outer region
        const outer = ranges.find(r => r.startLine === 1);
        expect(outer).to.exist;
        expect(outer?.endLine).to.equal(4);
    });
});
