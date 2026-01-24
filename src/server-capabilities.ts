import { ServerCapabilities, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { tokenTypes, tokenModifiers } from './features/semanticTokens';

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
    semanticTokensProvider: {
        legend: {
            tokenTypes: tokenTypes,
            tokenModifiers: tokenModifiers
        },
        full: true
    },
    workspace: {
        workspaceFolders: {
            supported: true
        }
    }
};
