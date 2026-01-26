import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';
import { onImplementation } from '../src/features/implementation';

describe('Implementation Feature', () => {
    it('should find implementation of an interface', () => {
        const text = `
Interface ILogger
    Sub Log(msg As String)
End Interface

Class ConsoleLogger
    Implements ILogger
    Sub Log(msg As String)
        ' ...
    End Sub
End Class
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, text);
        // "Interface ILogger" is at line 1.
        // "Implements ILogger" is at line 6.
        // Cursor at "ILogger" (line 1, char 12)
        const position = Position.create(1, 12);

        const locations = onImplementation(
            { textDocument: { uri: document.uri }, position },
            document,
            [document]
        );

        expect(locations).to.have.lengthOf(1);
        // Should point to ConsoleLogger class
        // Line 5: Class ConsoleLogger
        expect(locations[0].range.start.line).to.equal(5);
    });

    it('should find implementation across files', () => {
        const text1 = `
Interface ILogger
    Sub Log()
End Interface
`;
        const text2 = `
Class FileLogger
    Implements ILogger
End Class
`;
        const doc1 = TextDocument.create('file:///1.vb', 'vb', 1, text1);
        const doc2 = TextDocument.create('file:///2.vb', 'vb', 1, text2);

        const position = Position.create(1, 12); // ILogger in doc1

        const locations = onImplementation(
            { textDocument: { uri: doc1.uri }, position },
            doc1,
            [doc1, doc2]
        );

        expect(locations).to.have.lengthOf(1);
        expect(locations[0].uri).to.equal(doc2.uri);
        expect(locations[0].range.start.line).to.equal(1); // Class FileLogger
    });
});
