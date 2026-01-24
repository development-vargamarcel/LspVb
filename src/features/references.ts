import { Location, ReferenceParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { getWordAtPosition } from '../utils/textUtils';

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

    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const locations: Location[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;
        // Search all occurrences in the line
        // We need to use a global regex or loop with exec
        const globalRegex = new RegExp(`\\b${word}\\b`, 'gi');

        while ((match = globalRegex.exec(line)) !== null) {
            // Check if it's inside a comment?
            // Simple check: if there is a ' before this match on the line, it might be a comment.
            // But ' can be in a string too.
            // Using a simplified check based on `stripComment` logic from other files might be good,
            // but `stripComment` removes the comment, making indices mismatch.
            // For now, let's just ignore the comment part of the line if possible.

            const commentIndex = line.indexOf("'");
            if (commentIndex !== -1 && match.index > commentIndex) {
                // It's likely in a comment (assuming ' is not in a string)
                // This is a "Simple" VB server, so simple comment detection is acceptable.
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
