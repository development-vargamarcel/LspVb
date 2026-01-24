import { RenameParams, WorkspaceEdit, TextEdit } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { onReferences } from './references';

/**
 * Handles Rename requests.
 * Renames all occurrences of the symbol under the cursor.
 * Uses `onReferences` to find locations.
 *
 * @param params The rename parameters (position, new name).
 * @param document The text document.
 * @returns A WorkspaceEdit describing the changes.
 */
export function onRenameRequest(
    params: RenameParams,
    document: TextDocument
): WorkspaceEdit | null {
    Logger.log(
        `Rename requested at ${params.position.line}:${params.position.character} to '${params.newName}'`
    );
    const newName = params.newName;
    const locations = onReferences(
        {
            textDocument: params.textDocument,
            position: params.position,
            context: { includeDeclaration: true }
        },
        document
    );

    if (!locations || locations.length === 0) {
        Logger.debug('Rename: No occurrences found.');
        return null;
    }

    Logger.debug(`Rename: Found ${locations.length} occurrences to rename.`);
    const changes: { [uri: string]: TextEdit[] } = {};

    locations.forEach((location) => {
        if (!changes[location.uri]) {
            changes[location.uri] = [];
        }
        changes[location.uri].push(TextEdit.replace(location.range, newName));
    });

    return {
        changes: changes
    };
}
