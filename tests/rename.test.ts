import { expect } from 'chai';
import { onRenameRequest } from '../src/features/rename';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { RenameParams, Position } from 'vscode-languageserver/node';

describe('Rename Feature', () => {
    it('should rename all occurrences', () => {
        const text = `
Sub Main()
    Dim oldName As Integer
    oldName = 10
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(2, 8); // "oldName"

        const params: RenameParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: position,
            newName: 'newName'
        };

        const workspaceEdit = onRenameRequest(params, document);

        expect(workspaceEdit).to.not.be.null;
        expect(workspaceEdit!.changes).to.have.property('file:///test.vb');
        const edits = workspaceEdit!.changes!['file:///test.vb'];

        expect(edits).to.have.lengthOf(2);
        expect(edits[0].newText).to.equal('newName');
        expect(edits[1].newText).to.equal('newName');
    });

    it('should return null if symbol not found', () => {
         const text = `
Sub Main()
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(0, 0); // Empty line

        const params: RenameParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: position,
            newName: 'newName'
        };

        const workspaceEdit = onRenameRequest(params, document);
        expect(workspaceEdit).to.be.null; // Logic returns null if no references found
    });
});
