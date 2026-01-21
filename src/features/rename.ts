import { RenameParams, WorkspaceEdit, TextEdit } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onReferences } from './references';

export function onRenameRequest(
    params: RenameParams,
    document: TextDocument
): WorkspaceEdit | null {
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
        return null;
    }

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
