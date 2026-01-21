import { expect } from 'chai';
import { DefinitionParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onDefinition } from '../src/features/definition';

describe('Definition Feature', () => {
    it('should find definition of a symbol', () => {
        const content = `
Public Sub TargetMethod()
End Sub

Public Sub Caller()
    TargetMethod()
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);

        // Caller usage at line 5, char 8
        const params: DefinitionParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: { line: 5, character: 8 }
        };

        const result = onDefinition(params, document);

        // It returns a Location or Location[] or null.
        // onDefinition returns Definition | null. Definition is Location | Location[] | ...

        expect(result).to.exist;
        if (result && !Array.isArray(result)) {
             // Location
             expect(result.range.start.line).to.equal(1);
        }
    });

    it('should return null if definition not found', () => {
         const content = `
Public Sub Caller()
    UnknownMethod()
End Sub
`;
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: DefinitionParams = {
            textDocument: { uri: 'file:///test.vb' },
            position: { line: 2, character: 8 }
        };

        const result = onDefinition(params, document);
        expect(result).to.be.null;
    });
});
