import { Definition, DefinitionParams, Location } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols } from '../utils/parser';

export function onDefinition(params: DefinitionParams, document: TextDocument): Definition | null {
    const position = params.position;
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Identify word boundaries
    let start = offset;
    while (start > 0 && /[\w]/.test(text.charAt(start - 1))) {
        start--;
    }

    let end = offset;
    while (end < text.length && /[\w]/.test(text.charAt(end))) {
        end++;
    }

    if (start === end) {
        return null;
    }

    const word = text.substring(start, end);
    const lowerWord = word.toLowerCase();

    const symbols = parseDocumentSymbols(document);
    // Find the symbol definition
    const matchedSymbol = symbols.find(s => s.name.toLowerCase() === lowerWord);

    if (matchedSymbol) {
        return Location.create(document.uri, matchedSymbol.selectionRange);
    }

    return null;
}
