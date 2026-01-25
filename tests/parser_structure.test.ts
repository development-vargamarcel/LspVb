import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolKind } from 'vscode-languageserver/node';
import { parseDocumentSymbols } from '../src/utils/parser';

describe('Parser - Structure Enhancements', () => {

    it('should parse Imports statements', () => {
        const text = `
Imports System
Imports System.Collections
Sub Main()
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const symbols = parseDocumentSymbols(document);

        const imports = symbols.filter(s => s.kind === SymbolKind.Package);
        expect(imports).to.have.lengthOf(2);
        expect(imports[0].name).to.equal('System');
        expect(imports[1].name).to.equal('System.Collections');
    });

    it('should parse Region blocks', () => {
        const text = `
#Region "My Region"
    Sub MySub()
    End Sub
#End Region
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const symbols = parseDocumentSymbols(document);

        // Region should be a symbol containing Sub
        const region = symbols.find(s => s.name === '"My Region"' || s.name === 'My Region');
        expect(region).to.exist;
        expect(region!.kind).to.equal(SymbolKind.Namespace); // Or whatever we decide
        expect(region!.children).to.have.lengthOf(1);
        expect(region!.children![0].name).to.equal('MySub');
    });

    it('should handle nested Regions', () => {
        const text = `
#Region "Outer"
    #Region "Inner"
        Dim x
    #End Region
#End Region
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const symbols = parseDocumentSymbols(document);

        const outer = symbols.find(s => s.name.includes('Outer'));
        expect(outer).to.exist;
        expect(outer!.children).to.have.lengthOf(1);

        const inner = outer!.children![0];
        expect(inner.name).to.include('Inner');
        expect(inner.children).to.have.lengthOf(1);
        expect(inner.children![0].name).to.equal('x');
    });
});
