import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols } from '../src/utils/parser';

describe('Parser Tests for Signature Help', () => {
    it('should capture empty parentheses in detail', () => {
        const content = 'Sub MySub()';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(document);

        expect(symbols).to.have.lengthOf(1);
        expect(symbols[0].detail).to.equal('Sub()');
    });

    it('should capture parameters in detail', () => {
        const content = 'Sub MySub(x As Integer)';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(document);

        expect(symbols).to.have.lengthOf(1);
        expect(symbols[0].detail).to.equal('Sub(x As Integer)');
    });

    it('should not capture parentheses if none exist', () => {
        const content = 'Sub MySub';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(document);

        expect(symbols).to.have.lengthOf(1);
        expect(symbols[0].detail).to.equal('Sub');
    });
});
