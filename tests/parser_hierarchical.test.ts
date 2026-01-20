import * as assert from 'assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols } from '../src/utils/parser';
import { SymbolKind } from 'vscode-languageserver/node';

describe('Parser Hierarchical Tests', () => {
    it('should nest Sub inside Class', () => {
        const content = `
Class MyClass
    Public Sub MyMethod()
    End Sub
End Class
`;
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(doc);

        // Expect top level Class
        assert.strictEqual(symbols.length, 1, 'Should have 1 top level symbol (Class)');
        const cls = symbols[0];
        assert.strictEqual(cls.name, 'MyClass');
        assert.strictEqual(cls.kind, SymbolKind.Class);

        // Expect child Method
        assert.strictEqual(cls.children?.length, 1, 'Class should have 1 child');
        const method = cls.children![0];
        assert.strictEqual(method.name, 'MyMethod');
        assert.strictEqual(method.kind, SymbolKind.Method);
    });

    it('should nest Variables inside Sub', () => {
        const content = `
Sub MySub
    Dim x As Integer
End Sub
`;
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(doc);

        assert.strictEqual(symbols.length, 1, 'Should have 1 top level symbol (Sub)');
        const sub = symbols[0];
        assert.strictEqual(sub.name, 'MySub');

        assert.strictEqual(sub.children?.length, 1, 'Sub should have 1 child (Dim)');
        const variable = sub.children![0];
        assert.strictEqual(variable.name, 'x');
    });

    it('should handle multi-level nesting', () => {
        const content = `
Module MyModule
    Class MyClass
        Function MyFunc
            Dim y
        End Function
    End Class
End Module
`;
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const symbols = parseDocumentSymbols(doc);

        assert.strictEqual(symbols.length, 1, 'Top: Module');
        const mod = symbols[0];
        assert.strictEqual(mod.name, 'MyModule');

        assert.strictEqual(mod.children?.length, 1, 'Module -> Class');
        const cls = mod.children![0];
        assert.strictEqual(cls.name, 'MyClass');

        assert.strictEqual(cls.children?.length, 1, 'Class -> Function');
        const func = cls.children![0];
        assert.strictEqual(func.name, 'MyFunc');

        assert.strictEqual(func.children?.length, 1, 'Function -> Dim');
        const v = func.children![0];
        assert.strictEqual(v.name, 'y');
    });
});
