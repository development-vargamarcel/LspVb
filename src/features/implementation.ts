import { Location, SymbolKind, DefinitionParams, DocumentSymbol } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { getWordAtPosition } from '../utils/textUtils';
import { parseDocumentSymbols } from '../utils/parser';

/**
 * Handles Go to Implementation requests.
 * Finds all classes/structures that implement the interface at the cursor.
 *
 * @param params The definition parameters (position, document).
 * @param document The current text document.
 * @param allDocuments List of all open documents to search in.
 * @returns A list of locations where the interface is implemented.
 */
export function onImplementation(
    params: DefinitionParams,
    document: TextDocument,
    allDocuments: TextDocument[] = [document]
): Location[] {
    Logger.log(`Implementation requested at ${params.position.line}:${params.position.character}`);
    const word = getWordAtPosition(document, params.position);
    if (!word) {
        Logger.debug('Implementation: No word found at position.');
        return [];
    }

    Logger.debug(`Implementation: Searching for implementations of '${word}'`);

    const locations: Location[] = [];

    // Search all documents for "Implements <word>"
    for (const doc of allDocuments) {
        // We use parseDocumentSymbols to get the symbol tree
        // The parser now identifies "Implements Foo" as a SymbolKind.Interface with name "Foo"
        const symbols = parseDocumentSymbols(doc);

        const traverse = (syms: DocumentSymbol[], parent: DocumentSymbol | null) => {
            for (const sym of syms) {
                // Check if this symbol is an "Implements" statement
                // In parser.ts, we set kind = Interface and name = InterfaceName for Implements statements
                // AND detail starts with "Implements "
                // Also check if name matches the word at cursor (case insensitive)
                if (
                    sym.kind === SymbolKind.Interface &&
                    sym.detail?.startsWith('Implements ') &&
                    sym.name.toLowerCase() === word.toLowerCase()
                ) {
                    // Found an implementation!
                    if (parent) {
                        Logger.debug(
                            `Implementation: Found implementation in '${parent.name}' (${doc.uri})`
                        );
                        // Return the location of the Class/Structure (parent)
                        locations.push(Location.create(doc.uri, parent.selectionRange));
                    } else {
                        // Top-level Implements (unlikely in valid VB but possible in parser result)
                        Logger.debug(
                            `Implementation: Found top-level implementation in ${doc.uri}`
                        );
                        locations.push(Location.create(doc.uri, sym.selectionRange));
                    }
                }

                if (sym.children) {
                    traverse(sym.children, sym);
                }
            }
        };

        traverse(symbols, null);
    }

    Logger.debug(`Implementation: Found ${locations.length} implementations.`);
    return locations;
}
