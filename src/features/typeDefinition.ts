import { Definition, DefinitionParams, Location } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { parseDocumentSymbols, findSymbolAtPosition, findSymbolInScope } from '../utils/parser';
import { getWordAtPosition } from '../utils/textUtils';

/**
 * Handles Go to Type Definition requests.
 * Finds the definition of the *type* of the symbol under the cursor.
 *
 * @param params The definition parameters.
 * @param document The text document.
 * @returns The location of the type definition, or null if not found.
 */
export function onTypeDefinition(
    params: DefinitionParams,
    document: TextDocument
): Definition | null {
    Logger.log(`Type Definition requested at ${params.position.line}:${params.position.character}`);
    const word = getWordAtPosition(document, params.position);
    if (!word) return null;

    const symbols = parseDocumentSymbols(document);

    // 1. Find the symbol under cursor
    const symbol = findSymbolAtPosition(symbols, word, params.position);
    if (!symbol) {
        Logger.debug(`TypeDefinition: Symbol '${word}' not found.`);
        return null;
    }

    // 2. Determine its type
    // Parse 'detail' field: "Dim x As Person" -> "Person"
    // Or "Argument p As Person"
    // Or "Function f() As Person"

    if (!symbol.detail) return null;

    const asMatch = /\bAs\s+(\w+)/i.exec(symbol.detail);
    if (!asMatch) {
        Logger.debug(`TypeDefinition: Could not determine type from '${symbol.detail}'.`);
        return null;
    }

    const typeName = asMatch[1];
    Logger.debug(`TypeDefinition: Looking for type '${typeName}'.`);

    // 3. Find definition of the type
    const typeSymbol = findSymbolInScope(symbols, typeName, params.position);

    if (typeSymbol) {
        Logger.debug(`TypeDefinition: Found type '${typeSymbol.name}'.`);
        return Location.create(document.uri, typeSymbol.selectionRange);
    }

    Logger.debug(`TypeDefinition: Type '${typeName}' not found.`);
    return null;
}
