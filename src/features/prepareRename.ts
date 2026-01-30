import { PrepareRenameParams, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getWordRangeAtPosition } from '../utils/textUtils';
import { KEYWORDS } from '../keywords';
import { Logger } from '../utils/logger';

/**
 * Handles Prepare Rename requests.
 * Checks if the symbol at the position is valid for renaming.
 *
 * @param params The prepare rename parameters.
 * @param document The text document.
 * @returns The range to rename, or null if invalid.
 */
export function onPrepareRename(
    params: PrepareRenameParams,
    document: TextDocument
): Range | null {
    const position = params.position;
    Logger.log(`Prepare Rename requested at ${document.uri}:${position.line}:${position.character}`);

    const range = getWordRangeAtPosition(document, position);
    if (!range) {
        Logger.debug('Prepare Rename: No word found at position.');
        return null;
    }

    const word = document.getText(range);

    // Check if it's a keyword
    if (KEYWORDS[word.toLowerCase()]) {
        Logger.debug(`Prepare Rename: Cannot rename keyword '${word}'.`);
        return null;
    }

    // Check if it looks like a valid identifier
    if (!/^[a-zA-Z_]\w*$/.test(word)) {
        Logger.debug(`Prepare Rename: '${word}' is not a valid identifier.`);
        return null;
    }

    Logger.debug(`Prepare Rename: Valid symbol '${word}' found.`);
    return range;
}
