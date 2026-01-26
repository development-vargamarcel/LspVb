import { Location, ReferenceParams, SymbolKind, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { getWordAtPosition } from '../utils/textUtils';
import { parseDocumentSymbols, findSymbolAtPosition, findSymbolParent } from '../utils/parser';

/**
 * Handles Find References requests.
 * Finds all occurrences of the symbol under the cursor.
 * Supports multi-file references if `allDocuments` is provided.
 *
 * @param params The reference parameters.
 * @param document The text document.
 * @param allDocuments Optional list of all open documents.
 * @returns An array of locations where the symbol is found.
 */
export function onReferences(
    params: ReferenceParams,
    document: TextDocument,
    allDocuments: TextDocument[] = [document]
): Location[] {
    Logger.log(`References requested at ${params.position.line}:${params.position.character}`);
    const word = getWordAtPosition(document, params.position);
    if (!word) {
        Logger.debug('References: No word found at position.');
        return [];
    }

    Logger.debug(`References: Searching for '${word}'`);

    const symbols = parseDocumentSymbols(document);
    const definition = findSymbolAtPosition(symbols, word, params.position);

    let searchRange: Range | null = null;
    let targetDocuments: TextDocument[] = allDocuments;

    if (definition) {
        const parent = findSymbolParent(symbols, definition);
        if (parent && isMethodLike(parent.kind)) {
            // Local variable or parameter in current document
            searchRange = parent.range;
            targetDocuments = [document]; // Restrict to current document
            Logger.debug(
                `References: Symbol '${word}' is local to '${parent.name}'. Restricting search to lines ${searchRange.start.line}-${searchRange.end.line} in current document.`
            );
        } else {
            // Global or Class member defined in current document -> Search all
            Logger.debug(`References: Symbol '${word}' is Global/Member. Searching all documents.`);
        }
    } else {
        // Not defined in current document (or not found). Assume Global -> Search all
        Logger.debug(
            `References: Symbol '${word}' definition not found in current document. Searching all documents.`
        );
    }

    const locations: Location[] = [];

    for (const doc of targetDocuments) {
        const text = doc.getText();
        const lines = text.split(/\r?\n/);

        let startLine = 0;
        let endLine = lines.length;

        // Apply searchRange ONLY if we are in the definition document (and searchRange is set)
        if (searchRange && doc.uri === document.uri) {
            startLine = searchRange.start.line;
            endLine = searchRange.end.line + 1;
            if (endLine > lines.length) endLine = lines.length;
        }

        for (let i = startLine; i < endLine; i++) {
            const line = lines[i];
            let match;
            // Search all occurrences in the line
            const globalRegex = new RegExp(`\\b${word}\\b`, 'gi');

            while ((match = globalRegex.exec(line)) !== null) {
                // Check if it's inside a comment
                const commentIndex = line.indexOf("'");
                if (commentIndex !== -1 && match.index > commentIndex) {
                    continue;
                }

                locations.push({
                    uri: doc.uri,
                    range: {
                        start: { line: i, character: match.index },
                        end: { line: i, character: match.index + word.length }
                    }
                });
            }
        }
    }

    Logger.debug(`References: Found ${locations.length} occurrences.`);

    if (params.context && !params.context.includeDeclaration && definition) {
        // Filter out the definition location if it's in the results
        // definition comes from 'document' (current doc).
        const defUri = document.uri;
        return locations.filter(
            (loc) => !(loc.uri === defUri && rangesEqual(loc.range, definition!.selectionRange))
        );
    }

    return locations;
}

/**
 * Checks if two ranges are equal.
 */
function rangesEqual(r1: Range, r2: Range): boolean {
    return (
        r1.start.line === r2.start.line &&
        r1.start.character === r2.start.character &&
        r1.end.line === r2.end.line &&
        r1.end.character === r2.end.character
    );
}

/**
 * Checks if the symbol kind is method-like (Method, Function, Constructor, Property).
 * Locals defined inside these should be scoped to them.
 */
function isMethodLike(kind: SymbolKind): boolean {
    return (
        kind === SymbolKind.Method ||
        kind === SymbolKind.Function ||
        kind === SymbolKind.Constructor ||
        kind === SymbolKind.Property
    );
}
