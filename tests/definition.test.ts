import { expect } from 'chai';
import { DefinitionParams, Position } from 'vscode-languageserver/node';
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

    describe('Scope Awareness', () => {
        const text = `
Class MyClass
    Public x As String ' Class Member

    Sub Test()
        Dim x As Integer ' Local Variable
        x = 1

        If True Then
            Dim x As Boolean ' Block Variable (Shadowing)
            x = True
        End If

        x = 2
    End Sub

    Sub Other()
        x = "Hello" ' Should refer to Class Member
    End Sub
End Class
`;
        const document = TextDocument.create('uri', 'vb', 1, text);

        // Helper to get definition line number
        function getDefinitionLine(line: number, char: number): number | undefined {
            const position = Position.create(line, char);
            const def = onDefinition({ textDocument: { uri: 'uri' }, position }, document);
            if (def && 'range' in def) {
                return def.range.start.line;
            }
            return undefined;
        }

        it('should resolve Block Variable inside block', () => {
            // Line 10: x = True. Should refer to Line 9 (Dim x As Boolean)
            const defLine = getDefinitionLine(10, 12);
            expect(defLine).to.equal(9);
        });

        it('should resolve Local Variable outside block', () => {
            // Line 13: x = 2. Should refer to Line 5 (Dim x As Integer)
            const defLine = getDefinitionLine(13, 8);
            expect(defLine).to.equal(5);
        });

        it('should resolve Class Member in another method', () => {
            // Line 17: x = "Hello". Should refer to Line 2 (Public x As String)
            const defLine = getDefinitionLine(17, 8);
            expect(defLine).to.equal(2);
        });

        it('should resolve Local Variable (definition line itself)', () => {
            // Line 6: x = 1. Should refer to Line 5.
            const defLine = getDefinitionLine(6, 8);
            expect(defLine).to.equal(5);
        });
    });

    it('should find definition in another document', () => {
        const text1 = `
Public Class GlobalClass
End Class
        `;
        const text2 = `
Sub Main()
    Dim x As GlobalClass
End Sub
        `;
        const doc1 = TextDocument.create('file:///file1.vb', 'vb', 1, text1);
        const doc2 = TextDocument.create('file:///file2.vb', 'vb', 1, text2);

        // Find definition of GlobalClass in doc2
        const params: DefinitionParams = {
            textDocument: { uri: 'file:///file2.vb' },
            position: { line: 2, character: 15 } // Dim x As GlobalClass
        };

        const result = onDefinition(params, doc2, [doc1, doc2]);

        expect(result).to.exist;
        if (result && !Array.isArray(result)) {
            // Location
            expect(result.uri).to.equal('file:///file1.vb');
            expect(result.range.start.line).to.equal(1);
        }
    });
});
