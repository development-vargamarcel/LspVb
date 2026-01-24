import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onSemanticTokens, tokenTypes } from '../src/features/semanticTokens';

describe('Semantic Tokens Feature', () => {
    it('should provide tokens for document symbols', () => {
        const content = `
        Class MyClass
            Dim myVar As Integer
            Sub MyMethod()
            End Sub
        End Class
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);

        const tokens = onSemanticTokens({ textDocument: { uri: document.uri } }, document);

        expect(tokens).to.exist;
        expect(tokens.data).to.be.an('array');
        expect(tokens.data.length).to.be.greaterThan(0);

        // Check if we have tokens for MyClass, myVar, MyMethod
        // 5 integers per token
        expect(tokens.data.length % 5).to.equal(0);
        const tokenCount = tokens.data.length / 5;
        expect(tokenCount).to.be.at.least(3);
    });
});
