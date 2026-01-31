import { expect } from 'chai';
import {
    DiagnosticSeverity,
    TextDocument,
    CodeActionKind,
    CodeAction
} from 'vscode-languageserver/node';
import { validateTextDocument } from '../src/features/validation';
import { onCodeAction } from '../src/features/codeAction';

function createDoc(content: string): TextDocument {
    return TextDocument.create('file://test.vb', 'vb', 1, content);
}

describe('Interface Implementation Feature', () => {
    it('should detect missing interface members', () => {
        const content = `
Interface ITest
    Sub Method1()
    Function Func1() As Integer
End Interface

Class MyClass
    Implements ITest

    Sub Method1()
    End Sub
End Class
`;
        const doc = createDoc(content);
        const diagnostics = validateTextDocument(doc);

        // Should have error for Func1
        const errors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error && d.message.includes('must implement member'));
        expect(errors.length).to.equal(1);
        expect(errors[0].message).to.contain("must implement member 'Func1'");
        expect(errors[0].data).to.deep.include({
             missingMember: 'Func1',
             interfaceName: 'ITest'
        });
    });

    it('should not report errors when all members are implemented', () => {
        const content = `
Interface ITest
    Sub Method1()
End Interface

Class MyClass
    Implements ITest

    Sub Method1()
    End Sub
End Class
`;
        const doc = createDoc(content);
        const diagnostics = validateTextDocument(doc);

        const errors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error && d.message.includes('must implement member'));
        expect(errors.length).to.equal(0);
    });

    it('should provide code action to implement missing member', () => {
        const content = `
Interface ITest
    Sub Method1()
End Interface

Class MyClass
    Implements ITest
End Class
`;
        const doc = createDoc(content);
        const diagnostics = validateTextDocument(doc);
        expect(diagnostics.length).to.be.greaterThan(0);

        const diagnostic = diagnostics.find(d => d.message.includes("must implement member 'Method1'"));
        expect(diagnostic).to.not.be.undefined;

        if (diagnostic) {
            const params = {
                textDocument: { uri: doc.uri },
                range: diagnostic.range,
                context: { diagnostics: [diagnostic] }
            } as any;

            const actions = onCodeAction(params, doc);
            const implementAction = actions.find(a => a.title === "Implement 'Method1'") as CodeAction;

            expect(implementAction).to.not.be.undefined;
            expect(implementAction.kind).to.equal(CodeActionKind.QuickFix);

            const edit = implementAction.edit?.changes?.[doc.uri];
            expect(edit).to.not.be.undefined;
            if (edit) {
                // Check content of edit
                const text = edit[0].newText;
                expect(text).to.contain('Public Sub Method1() Implements ITest.Method1');
                expect(text).to.contain('Throw New NotImplementedException()');
            }
        }
    });

    it('should detect interface across files', () => {
         // Mocking multi-file by passing array of docs
         const doc1Content = `
Interface IGlobal
    Sub DoIt()
End Interface
`;
         const doc2Content = `
Class MyClass
    Implements IGlobal
End Class
`;
         const doc1 = TextDocument.create('file://doc1.vb', 'vb', 1, doc1Content);
         const doc2 = TextDocument.create('file://doc2.vb', 'vb', 1, doc2Content);

         const diagnostics = validateTextDocument(doc2, [doc1, doc2]);

         const errors = diagnostics.filter(d => d.message.includes("must implement member 'DoIt'"));
         expect(errors.length).to.equal(1);
    });
});
