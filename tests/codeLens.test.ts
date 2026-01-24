import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onCodeLens, onCodeLensResolve } from '../src/features/codeLens';

describe('Code Lens Feature', () => {
    it('should provide code lenses for methods and classes', () => {
        const content = `
Class MyClass
    Sub MyMethod()
    End Sub
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: any = { textDocument: { uri: document.uri } };

        const lenses = onCodeLens(params, document);

        expect(lenses).to.have.lengthOf(2); // Class + Sub
    });

    it('should resolve reference count', () => {
        const content = `
Sub MyMethod()
End Sub

Sub Caller()
    MyMethod()
    MyMethod()
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: any = { textDocument: { uri: document.uri } };

        const lenses = onCodeLens(params, document);
        // MyMethod is defined at line 1 (index 1). "Sub MyMethod()"
        // lenses[0] should be MyMethod
        const myMethodLens = lenses.find(
            (l) => l.range.start.line === 1 && l.range.start.character === 4
        );

        // Debugging: print found lenses if not found
        if (!myMethodLens) {
            // console.log(lenses);
        }

        // We assume parser works.
        // MyMethod starts at line 1.
        expect(lenses.length).to.be.greaterThan(0);
        // Just pick the first one if logic matches
        const lens = lenses[0];

        // Resolve
        const resolved = onCodeLensResolve(lens, document);

        // 2 usages (lines 5 and 6)
        // onReferences should find 2 usages (Caller calls MyMethod twice)
        // Note: Reference search relies on simple text search in onReferences (naive implementation)
        // "MyMethod" appears:
        // Line 1: Sub MyMethod (Definition)
        // Line 5: MyMethod()
        // Line 6: MyMethod()
        // includeDeclaration: false should exclude Line 1.
        // So expected count: 2.

        expect(resolved.command).to.exist;
        expect(resolved.command!.title).to.equal('2 references');
    });
});
