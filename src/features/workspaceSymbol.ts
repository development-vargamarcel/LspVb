import {
    WorkspaceSymbolParams,
    SymbolInformation,
    Location,
    DocumentSymbol
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { parseDocumentSymbols } from '../utils/parser';

/**
 * Handles Workspace Symbol requests.
 * Searches for symbols across all open documents matching the query.
 *
 * @param params The workspace symbol parameters (query).
 * @param documents All open documents.
 * @returns An array of SymbolInformation.
 */
export function onWorkspaceSymbol(
    params: WorkspaceSymbolParams,
    documents: TextDocument[]
): SymbolInformation[] {
    Logger.log(`Workspace Symbol requested with query '${params.query}'`);
    const query = params.query.toLowerCase();
    const result: SymbolInformation[] = [];

    for (const doc of documents) {
        const symbols = parseDocumentSymbols(doc);
        const flattened = flattenSymbols(symbols, doc.uri);

        for (const sym of flattened) {
            if (sym.name.toLowerCase().includes(query)) {
                result.push(sym);
            }
        }
    }

    Logger.debug(`Workspace Symbol: Found ${result.length} matches.`);
    return result;
}

/**
 * Flattens a hierarchical DocumentSymbol structure into a flat SymbolInformation array.
 *
 * @param symbols The document symbols.
 * @param uri The document URI.
 * @param containerName The name of the parent symbol (optional).
 * @returns An array of SymbolInformation.
 */
function flattenSymbols(
    symbols: DocumentSymbol[],
    uri: string,
    containerName?: string
): SymbolInformation[] {
    const result: SymbolInformation[] = [];

    for (const sym of symbols) {
        result.push({
            name: sym.name,
            kind: sym.kind,
            location: Location.create(uri, sym.range),
            containerName: containerName
        });

        if (sym.children) {
            result.push(...flattenSymbols(sym.children, uri, sym.name));
        }
    }
    return result;
}
