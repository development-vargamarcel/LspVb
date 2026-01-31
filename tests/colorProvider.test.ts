import { expect } from 'chai';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Color, Range } from 'vscode-languageserver/node';
import { onDocumentColor, onColorPresentation } from '../src/features/colorProvider';

describe('Color Provider Feature', () => {
    it('should find named colors', () => {
        const content = 'Dim c = Color.Red\nDim d = Color.Blue';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: any = { textDocument: { uri: document.uri } };

        const colors = onDocumentColor(params, document);

        expect(colors).to.have.lengthOf(2);

        // Color.Red
        expect(colors[0].color).to.deep.equal({ red: 1, green: 0, blue: 0, alpha: 1 });
        expect(colors[0].range).to.deep.equal(Range.create(0, 8, 0, 17)); // "Color.Red"

        // Color.Blue
        expect(colors[1].color).to.deep.equal({ red: 0, green: 0, blue: 1, alpha: 1 });
        expect(colors[1].range).to.deep.equal(Range.create(1, 8, 1, 18)); // "Color.Blue"
    });

    it('should find Color.FromArgb(r, g, b)', () => {
        const content = 'Dim c = Color.FromArgb(255, 0, 0)';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: any = { textDocument: { uri: document.uri } };

        const colors = onDocumentColor(params, document);

        expect(colors).to.have.lengthOf(1);
        expect(colors[0].color).to.deep.equal({ red: 1, green: 0, blue: 0, alpha: 1 });
    });

    it('should find Color.FromArgb(a, r, g, b)', () => {
        const content = 'Dim c = Color.FromArgb(128, 0, 255, 0)';
        const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
        const params: any = { textDocument: { uri: document.uri } };

        const colors = onDocumentColor(params, document);

        expect(colors).to.have.lengthOf(1);
        // 128/255 approx 0.502
        expect(colors[0].color.alpha).to.be.closeTo(128/255, 0.001);
        expect(colors[0].color.red).to.equal(0);
        expect(colors[0].color.green).to.equal(1);
        expect(colors[0].color.blue).to.equal(0);
    });

    it('should provide presentation for named color', () => {
        const document = TextDocument.create('file:///test.vb', 'vb', 1, 'Dim c = Color.Red');
        const color: Color = { red: 1, green: 0, blue: 0, alpha: 1 };
        const range = Range.create(0, 8, 0, 17);
        const params: any = {
            textDocument: { uri: document.uri },
            color: color,
            range: range
        };

        const presentations = onColorPresentation(params, document);

        expect(presentations).to.have.lengthOf(1);
        expect(presentations[0].label).to.equal('Color.Red');
        expect(presentations[0].textEdit!.newText).to.equal('Color.Red');
    });

    it('should provide presentation for custom color', () => {
        const document = TextDocument.create('file:///test.vb', 'vb', 1, 'Dim c = Color.FromArgb(100, 100, 100)');
        const color: Color = { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 };
        const range = Range.create(0, 8, 0, 39);
        const params: any = {
            textDocument: { uri: document.uri },
            color: color,
            range: range
        };

        const presentations = onColorPresentation(params, document);

        expect(presentations).to.have.lengthOf(1);
        // 0.5 * 255 = 127.5 -> 128, which matches Color.Gray
        expect(presentations[0].label).to.equal('Color.Gray');
    });
});
