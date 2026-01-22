import { ServerCapabilities, TextDocumentSyncKind } from 'vscode-languageserver/node';

export const SERVER_CAPABILITIES: ServerCapabilities = {
    textDocumentSync: TextDocumentSyncKind.Incremental,
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
    completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.']
    },
    workspace: {
        workspaceFolders: {
            supported: true
        }
    }
};
