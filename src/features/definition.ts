import { Definition, DefinitionParams, Location } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols, findSymbolAtPosition } from '../utils/parser';
import { getWordAtPosition } from '../utils/textUtils';

export function onDefinition(params: DefinitionParams, document: TextDocument): Definition | null {
    const word = getWordAtPosition(document, params.position);
    if (!word) {
        return null;
    }

    const lowerWord = word.toLowerCase();
    const symbols = parseDocumentSymbols(document);

    const matchedSymbol = findSymbolAtPosition(symbols, lowerWord, params.position);

    if (matchedSymbol) {
        return Location.create(document.uri, matchedSymbol.selectionRange);
    }

    return null;
}
