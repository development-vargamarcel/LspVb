import {
    DocumentHighlight,
    DocumentHighlightKind,
    DocumentHighlightParams
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { onReferences } from './references';

/**
 * Handles Document Highlight requests.
 * Highlights all occurrences of the symbol under the cursor.
 * Uses `onReferences` logic.
 *
 * @param params The document highlight parameters.
 * @param document The text document.
 * @returns An array of DocumentHighlight objects.
 */
export function onDocumentHighlight(
    params: DocumentHighlightParams,
    document: TextDocument
): DocumentHighlight[] {
    Logger.log(
        `Document Highlight requested at ${params.position.line}:${params.position.character}`
    );

    // Reuse scope-aware logic from onReferences
    // onReferences returns Location[] { uri, range }
    // We just need to map it to DocumentHighlight

    const locations = onReferences(
        {
            textDocument: params.textDocument,
            position: params.position,
            context: { includeDeclaration: true }
        },
        document
    );

    const highlights = locations.map((loc) => ({
        range: loc.range,
        kind: DocumentHighlightKind.Text // Default to Text since we don't distinguish Read/Write yet
    }));

    Logger.debug(`Document Highlight: Found ${highlights.length} highlights.`);
    return highlights;
}
