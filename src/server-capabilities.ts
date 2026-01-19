import { ServerCapabilities, TextDocumentSyncKind } from 'vscode-languageserver/node';

export const SERVER_CAPABILITIES: ServerCapabilities = {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: {
        resolveProvider: true
    },
    hoverProvider: true,
    documentSymbolProvider: true,
    foldingRangeProvider: true,
    definitionProvider: true,
    documentFormattingProvider: true,
    workspace: {
        workspaceFolders: {
            supported: true
        }
    }
};
