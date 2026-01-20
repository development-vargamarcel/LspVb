import { Definition, DefinitionParams, Location } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols } from '../utils/parser';
import { getWordAtPosition } from '../utils/textUtils';

export function onDefinition(params: DefinitionParams, document: TextDocument): Definition | null {
    const word = getWordAtPosition(document, params.position);
    if (!word) {
        return null;
    }

    const lowerWord = word.toLowerCase();
    const symbols = parseDocumentSymbols(document);

    const matchedSymbol = findSymbolRecursive(symbols, lowerWord);

    if (matchedSymbol) {
        return Location.create(document.uri, matchedSymbol.selectionRange);
    }

    return null;
}

function findSymbolRecursive(symbols: any[], name: string): any | null {
    for (const sym of symbols) {
        if (sym.name.toLowerCase() === name) {
            return sym;
        }
        if (sym.children) {
            const childMatch = findSymbolRecursive(sym.children, name);
            if (childMatch) return childMatch;
        }
    }
    return null;
}
