import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentLinkParams } from 'vscode-languageserver/node';
import { onDocumentLinks } from '../src/features/documentLink';

describe('Document Link Feature', () => {
    it('should find http links', () => {
        const text = 'Here is a link: http://example.com/foo. bar';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const params: DocumentLinkParams = { textDocument: { uri: document.uri } };

        const links = onDocumentLinks(params, document);

        expect(links).to.have.lengthOf(1);
        expect(links[0].target).to.equal('http://example.com/foo');
        expect(links[0].range).to.deep.equal({
            start: { line: 0, character: 16 },
            end: { line: 0, character: 38 }
        });
    });

    it('should find https links', () => {
        const text = 'Secure link: https://secure.com. ';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const params: DocumentLinkParams = { textDocument: { uri: document.uri } };

        const links = onDocumentLinks(params, document);

        expect(links).to.have.lengthOf(1);
        expect(links[0].target).to.equal('https://secure.com');
    });

    it('should extract links from strings correctly', () => {
        const text = 'Dim url = "https://example.com"';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const params: DocumentLinkParams = { textDocument: { uri: document.uri } };

        const links = onDocumentLinks(params, document);

        expect(links).to.have.lengthOf(1);
        expect(links[0].target).to.equal('https://example.com');
        expect(links[0].range.start.character).to.equal(11);
    });

    it('should handle multiple links', () => {
        const text = 'Check https://a.com and http://b.com';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const params: DocumentLinkParams = { textDocument: { uri: document.uri } };

        const links = onDocumentLinks(params, document);

        expect(links).to.have.lengthOf(2);
        expect(links[0].target).to.equal('https://a.com');
        expect(links[1].target).to.equal('http://b.com');
    });
});
