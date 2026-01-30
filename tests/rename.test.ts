import { expect } from 'chai';
import { onRenameRequest } from '../src/features/rename';
import { onPrepareRename } from '../src/features/prepareRename';
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

describe('Prepare Rename Feature', () => {
    it('should return range for valid symbol', () => {
        const text = `
Sub Main()
    Dim x As Integer
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(2, 8); // "x"

        const result = onPrepareRename({ textDocument: { uri: 'file:///test.vb' }, position }, document);
        expect(result).to.not.be.null;
        expect(result!.start.line).to.equal(2);
        // "    Dim " is 8 chars?
        // 012345678
        //     Dim x
        // D is at 4. i is at 5. m is at 6. space at 7. x at 8.
        expect(result!.start.character).to.equal(8);
        expect(result!.end.character).to.equal(9);
    });

    it('should return null for keywords', () => {
        const text = `
Sub Main()
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(1, 0); // "Sub"

        const result = onPrepareRename({ textDocument: { uri: 'file:///test.vb' }, position }, document);
        expect(result).to.be.null;
    });

    it('should return null for whitespace', () => {
        const text = `
Sub Main()

End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(2, 4); // whitespace

        const result = onPrepareRename({ textDocument: { uri: 'file:///test.vb' }, position }, document);
        expect(result).to.be.null;
    });
});
