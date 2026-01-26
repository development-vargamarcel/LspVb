import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { WorkspaceSymbolParams } from 'vscode-languageserver/node';
import { onWorkspaceSymbol } from '../src/features/workspaceSymbol';

describe('Workspace Symbol Feature', () => {
    it('should find symbols in multiple documents', () => {
        const doc1 = TextDocument.create('file:///file1.vb', 'vb', 1, 'Class MyClass1\nEnd Class');
        const doc2 = TextDocument.create('file:///file2.vb', 'vb', 1, 'Class MyClass2\nEnd Class');

        const params: WorkspaceSymbolParams = { query: 'MyClass' };
        const results = onWorkspaceSymbol(params, [doc1, doc2]);

        expect(results).to.have.lengthOf(2);
        expect(results.find(s => s.name === 'MyClass1')).to.exist;
        expect(results.find(s => s.name === 'MyClass2')).to.exist;
    });

    it('should filter symbols by query', () => {
        const doc1 = TextDocument.create('file:///file1.vb', 'vb', 1, 'Class Alpha\nEnd Class');
        const doc2 = TextDocument.create('file:///file2.vb', 'vb', 1, 'Class Beta\nEnd Class');

        const params: WorkspaceSymbolParams = { query: 'Alpha' };
        const results = onWorkspaceSymbol(params, [doc1, doc2]);

        expect(results).to.have.lengthOf(1);
        expect(results[0].name).to.equal('Alpha');
    });

    it('should find nested symbols', () => {
        const doc = TextDocument.create('file:///file1.vb', 'vb', 1, 'Class Outer\n  Sub Inner()\n  End Sub\nEnd Class');

        const params: WorkspaceSymbolParams = { query: 'Inner' };
        const results = onWorkspaceSymbol(params, [doc]);

        expect(results).to.have.lengthOf(1);
        expect(results[0].name).to.equal('Inner');
        expect(results[0].containerName).to.equal('Outer');
    });
});
