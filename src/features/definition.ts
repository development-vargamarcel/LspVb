import { Definition, DefinitionParams, Location } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { parseDocumentSymbols, findSymbolAtPosition } from '../utils/parser';
import { getWordAtPosition } from '../utils/textUtils';

/**
 * Handles Go to Definition requests.
 * Finds the definition of the symbol under the cursor.
 *
 * @param params The definition parameters.
 * @param document The text document.
 * @returns The location of the definition, or null if not found.
 */
export function onDefinition(params: DefinitionParams, document: TextDocument): Definition | null {
    Logger.log(`Definition requested at ${params.position.line}:${params.position.character}`);
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
