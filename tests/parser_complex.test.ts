import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { SymbolKind } from 'vscode-languageserver/node';
import { parseDocumentSymbols } from '../src/utils/parser';

describe('Parser Complex Signatures', () => {
    it('should parse Sub with generics', () => {
        const content = 'Sub MySub(x As List(Of String), y As Integer)\nEnd Sub';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(document);

        expect(symbols).to.have.lengthOf(1);
        const sub = symbols[0];
        expect(sub.name).to.equal('MySub');
        expect(sub.detail).to.equal('Sub(x As List(Of String), y As Integer)');

        // Children should be x and y
        expect(sub.children).to.have.lengthOf(2);

        expect(sub.children![0].name).to.equal('x');
        expect(sub.children![0].detail).to.equal('Argument x As List(Of String)');

        expect(sub.children![1].name).to.equal('y');
        expect(sub.children![1].detail).to.equal('Argument y As Integer');
    });

    it('should parse Function with array bounds in arguments', () => {
        const content = 'Function Matrix(a(,) As Integer) As Integer\nEnd Function';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(document);

        expect(symbols).to.have.lengthOf(1);
        const func = symbols[0];
        // The parser name extraction logic might capture 'Matrix' or 'Matrix(,)'.
        // Current logic: PARSER_BLOCK_REGEX -> Name is group 3.
        // `Function Matrix(a(,) As Integer)`
        // Regex `Function\s+(\w+)` matches `Matrix`.
        // Then we manually parse args.

        expect(func.name).to.equal('Matrix');
        // Our parser constructs detail as `${type}(${argsContent})`.
        // It does NOT capture return type "As Integer" at end of line or "Name" inside detail (based on my previous fix to satisfy legacy tests).
        // So expected is "Function(a(,) As Integer)"
        expect(func.detail).to.equal('Function(a(,) As Integer)');

        expect(func.children).to.have.lengthOf(1);
        expect(func.children![0].name).to.equal('a');
    });
});
