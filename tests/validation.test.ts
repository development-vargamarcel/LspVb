import * as assert from 'assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { validateTextDocument } from '../src/features/validation';

describe('Validation Tests', () => {
    it('should detect missing End Sub', () => {
        const content = 'Sub Test\n    Dim x As Integer';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const diagnostics = validateTextDocument(doc);

        const missingEnd = diagnostics.find(d => d.message.includes("Missing closing statement for 'Sub'"));
        assert.ok(missingEnd, 'Should report missing End Sub');
    });

    it('should detect missing Then in If', () => {
        const content = 'If x = 1\nEnd If';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const diagnostics = validateTextDocument(doc);

        const missingThen = diagnostics.find(d => d.message.includes("Missing 'Then'"));
        assert.ok(missingThen, 'Should report missing Then');
    });

    it('should detect Dim without As', () => {
        const content = 'Dim x';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const diagnostics = validateTextDocument(doc);

        const warning = diagnostics.find(d => d.message.includes("Variable declaration without type"));
        assert.ok(warning, 'Should warn about Dim without As');
    });

    it('should not report error for valid If...Then', () => {
        const content = 'If x = 1 Then\n    x = 2\nEnd If';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const diagnostics = validateTextDocument(doc);

        const error = diagnostics.find(d => d.severity === 1); // Error
        assert.strictEqual(error, undefined, 'Should have no errors');
    });

    it('should not report error for valid Single Line If', () => {
        const content = 'If x = 1 Then x = 2';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const diagnostics = validateTextDocument(doc);

        const error = diagnostics.find(d => d.severity === 1);
        assert.strictEqual(error, undefined, 'Should have no errors');
    });

     it('should detect mismatched blocks', () => {
        const content = 'Sub Test\n    If x = 1 Then\n    End Sub\nEnd If';
        const doc = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const diagnostics = validateTextDocument(doc);

        // This is tricky because the stack logic might report multiple things.
        // It should report "Expected closing for 'If', but found 'End Sub'"
        const mismatch = diagnostics.find(d => d.message.includes("Mismatched block"));
        assert.ok(mismatch, 'Should report mismatched block');
    });
});
