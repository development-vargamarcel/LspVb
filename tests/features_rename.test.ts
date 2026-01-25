import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { onRenameRequest } from '../src/features/rename';

describe('Rename Feature Enhancements', () => {
    it('should rename class and its usages', () => {
        const text = `
Class Person
End Class

Sub Main()
    Dim p As Person
End Sub
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        // Rename "Person" at definition
        const position = Position.create(1, 6); // "Class Person"

        const edit = onRenameRequest({
            textDocument: { uri: document.uri },
            position: position,
            newName: 'Employee'
        }, document);

        expect(edit).to.exist;
        const changes = edit!.changes![document.uri];
        expect(changes).to.have.lengthOf(2);

        // Definition
        const defChange = changes.find(c => c.range.start.line === 1);
        expect(defChange).to.exist;
        expect(defChange!.newText).to.equal('Employee');

        // Usage
        const usageChange = changes.find(c => c.range.start.line === 5);
        expect(usageChange).to.exist;
        expect(usageChange!.newText).to.equal('Employee');
    });

    it('should NOT rename if new name is invalid', () => {
        const text = `
Class Person
End Class
        `;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        const position = Position.create(1, 6);

        // Invalid name with space
        const edit = onRenameRequest({
            textDocument: { uri: document.uri },
            position: position,
            newName: 'Invalid Name'
        }, document);

        // Should return null or throw?
        // Current implementation returns edit. We want to prevent it.
        // If we implement validation, it should return null.
        expect(edit).to.be.null;
    });
});
