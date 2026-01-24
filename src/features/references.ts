import { Location, ReferenceParams, SymbolKind, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { getWordAtPosition } from '../utils/textUtils';
import { parseDocumentSymbols, findSymbolAtPosition, findSymbolParent } from '../utils/parser';

/**
 * Handles Find References requests.
 * Finds all occurrences of the symbol under the cursor in the current document.
 * Note: Multi-file references are not yet supported.
 *
 * @param params The reference parameters.
 * @param document The text document.
 * @returns An array of locations where the symbol is found.
 */
export function onReferences(params: ReferenceParams, document: TextDocument): Location[] {
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

    if (definition) {
        const parent = findSymbolParent(symbols, definition);
        if (parent && isMethodLike(parent.kind)) {
            // Local variable or parameter
            searchRange = parent.range;
            Logger.debug(
                `References: Symbol '${word}' is local to '${parent.name}'. Restricting search to lines ${searchRange.start.line}-${searchRange.end.line}.`
            );
        }
    }

    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const locations: Location[] = [];

    let startLine = 0;
    let endLine = lines.length;

    if (searchRange) {
        startLine = searchRange.start.line;
        endLine = searchRange.end.line + 1;
        if (endLine > lines.length) endLine = lines.length;
    }

    for (let i = startLine; i < endLine; i++) {
        const line = lines[i];
        let match;
        // Search all occurrences in the line
        // We need to use a global regex or loop with exec
        const globalRegex = new RegExp(`\\b${word}\\b`, 'gi');

        while ((match = globalRegex.exec(line)) !== null) {
            // Check if it's inside a comment?
            const commentIndex = line.indexOf("'");
            if (commentIndex !== -1 && match.index > commentIndex) {
                continue;
            }

            locations.push({
                uri: document.uri,
                range: {
                    start: { line: i, character: match.index },
                    end: { line: i, character: match.index + word.length }
                }
            });
        }
    }

    Logger.debug(`References: Found ${locations.length} occurrences.`);
    return locations;
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
