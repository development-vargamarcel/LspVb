import { Definition, DefinitionParams, Location } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { parseDocumentSymbols, findSymbolAtPosition, findGlobalSymbol } from '../utils/parser';
import { getWordAtPosition } from '../utils/textUtils';

/**
 * Handles Go to Definition requests.
 * Finds the definition of the symbol under the cursor.
 *
 * @param params The definition parameters.
 * @param document The text document.
 * @param allDocuments Optional list of all open documents to search in.
 * @returns The location of the definition, or null if not found.
 */
export function onDefinition(
    params: DefinitionParams,
    document: TextDocument,
    allDocuments: TextDocument[] = [document]
): Definition | null {
    Logger.log(`Definition requested at ${params.position.line}:${params.position.character}`);
    const word = getWordAtPosition(document, params.position);
    if (!word) {
        Logger.debug('Definition: No word found at position.');
        return null;
    }

    Logger.debug(`Definition: Searching for definition of '${word}'`);

    const lowerWord = word.toLowerCase();
    const symbols = parseDocumentSymbols(document);

    const matchedSymbol = findSymbolAtPosition(symbols, lowerWord, params.position);

    if (matchedSymbol) {
        Logger.debug(
            `Definition: Found symbol '${matchedSymbol.name}' at line ${matchedSymbol.range.start.line}.`
        );
        return Location.create(document.uri, matchedSymbol.selectionRange);
    }

    // Search in other documents
    if (allDocuments.length > 0) {
        Logger.debug(
            `Definition: Symbol not found in current document. Searching in ${allDocuments.length} documents.`
        );
        for (const doc of allDocuments) {
            if (doc.uri === document.uri) continue; // Already searched

            const docSymbols = parseDocumentSymbols(doc);
            const found = findGlobalSymbol(docSymbols, lowerWord);
            if (found) {
                Logger.debug(`Definition: Found symbol '${found.name}' in ${doc.uri}`);
                return Location.create(doc.uri, found.selectionRange);
            }
        }
    }

    Logger.debug('Definition: Symbol definition not found.');
    return null;
}
