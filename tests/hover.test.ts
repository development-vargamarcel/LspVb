import { expect } from 'chai';
import { HoverParams, MarkupContent } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onHover } from '../src/features/hover';

describe('Hover Feature', () => {
    it('should provide hover for keywords', () => {
        const content = 'Public Sub Main()';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: HoverParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: { line: 0, character: 8 } // 'Sub'
        };

        const result = onHover(params, document);
        expect(result).to.exist;
        const contents = result?.contents as MarkupContent;
        expect(contents.value).to.contain('Sub keyword');
    });

    it('should provide hover for user symbols', () => {
        const content = 'Public Sub MyMethod()\nEnd Sub';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: HoverParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: { line: 0, character: 15 } // 'MyMethod'
        };

        const result = onHover(params, document);
        expect(result).to.exist;
        const contents = result?.contents as MarkupContent;
        expect(contents.value).to.contain('MyMethod');
    });

    it('should return null for unknown words', () => {
        const content = 'Public Sub Main()';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: HoverParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: { line: 0, character: 0 } // 'Public' - wait, Public is a keyword?
        };
        // Let's try something random
        const content2 = 'UnknownWord';
        const doc2 = TextDocument.create('file:///test.vb', 'vb', 1, content2);
        const params2: HoverParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: { line: 0, character: 0 }
        };

        const result = onHover(params2, doc2);
        expect(result).to.be.null;
    });

    it('should provide hover for symbols in other documents', () => {
        const text1 = 'Class GlobalClass\nEnd Class';
        const text2 = 'Dim x As GlobalClass';
        const doc1 = TextDocument.create('file:///file1.vb', 'vb', 1, text1);
        const doc2 = TextDocument.create('file:///file2.vb', 'vb', 1, text2);

        const params: HoverParams = {
            textDocument: { uri: 'file:///file2.vb' },
            position: { line: 0, character: 12 } // 'GlobalClass'
        };

        const result = onHover(params, doc2, [doc1, doc2]);
        expect(result).to.exist;
        const contents = result?.contents as MarkupContent;
        expect(contents.value).to.contain('GlobalClass');
        expect(contents.value).to.contain('Class');
    });
});
