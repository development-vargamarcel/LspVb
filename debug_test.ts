import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver-textdocument';

const content = `
        Dim myVar
        Dim x As
        `;
const document = TextDocument.create('file:///test.vb', 'vb', 1, content);
const position = { line: 2, character: 17 };
const offset = document.offsetAt(position);
const text = document.getText();

console.log('Total Length:', text.length);
console.log('Offset:', offset);
console.log('Char at offset:', text[offset] === '\n' ? '\\n' : text[offset]);
console.log('Char at offset-1:', text[offset-1]);

let i = offset - 1;
// Skip current word being typed
while (i >= 0 && /\w/.test(text[i])) {
    i--;
}
// Skip whitespace
while (i >= 0 && /\s/.test(text[i])) {
    console.log('Skipping whitespace at', i, text[i] === '\n' ? '\\n' : text[i]);
    i--;
}

const end = i + 1;
let start = end;
while (start > 0 && /\w/.test(text[start - 1])) {
    start--;
}
const prevWord = text.substring(start, end).toLowerCase();
console.log('PrevWord:', prevWord);
