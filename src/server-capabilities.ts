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
    referencesProvider: true,
    renameProvider: true,
    codeActionProvider: true,
    signatureHelpProvider: {
        triggerCharacters: ['(', ',']
    },
    workspace: {
        workspaceFolders: {
            supported: true
        }
    }
};
