import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols, findSymbolParent } from '../src/utils/parser';

describe('Parser Enhancements', () => {
    it('should find the parent of a symbol', () => {
        const text = `
Class MyClass
    Sub MyMethod()
        Dim x As Integer
    End Sub
End Class
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const symbols = parseDocumentSymbols(document);

        // Structure:
        // MyClass
        //   MyMethod
        //     x

        const classSym = symbols[0];
        const methodSym = classSym.children![0];
        const varSym = methodSym.children![0];

        expect(findSymbolParent(symbols, methodSym)).to.equal(classSym);
        expect(findSymbolParent(symbols, varSym)).to.equal(methodSym);
        expect(findSymbolParent(symbols, classSym)).to.be.null;
    });

    it('should return null if symbol is not found in hierarchy', () => {
        const text = `
Class MyClass
End Class
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const symbols = parseDocumentSymbols(document);

        // Mock a symbol not in the tree
        const orphanSymbol: any = { name: 'Orphan' };

        expect(findSymbolParent(symbols, orphanSymbol)).to.be.null;
    });
});
