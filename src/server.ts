import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
    Hover,
    HoverParams,
    DocumentSymbol,
    DocumentSymbolParams,
    FoldingRange,
    FoldingRangeParams,
    DefinitionParams,
    Definition
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import { validateTextDocument } from './features/validation';
import { onCompletion, onCompletionResolve } from './features/completion';
import { onHover } from './features/hover';
import { onFoldingRanges } from './features/folding';
import { onDefinition } from './features/definition';
import { parseDocumentSymbols } from './utils/parser';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			},
            // Advertise capabilities
            hoverProvider: true,
            documentSymbolProvider: true,
            foldingRangeProvider: true,
            definitionProvider: true
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// Debounce timer for validation
let validationTimer: NodeJS.Timeout;

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    // Robustness: Debounce validation to prevent excessive processing on every keystroke
    if (validationTimer) {
        clearTimeout(validationTimer);
    }
    validationTimer = setTimeout(() => {
        try {
            const diagnostics = validateTextDocument(change.document);
            connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
        } catch (error) {
            connection.console.error(`Validation failed: ${error}`);
        }
    }, 200); // 200ms delay
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(params: TextDocumentPositionParams): CompletionItem[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        try {
            return onCompletion(params, document);
        } catch (error) {
            connection.console.error(`Completion failed: ${error}`);
            return [];
        }
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
        return onCompletionResolve(item);
	}
);

// This handler provides hover information.
connection.onHover((params: HoverParams): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;
    try {
        return onHover(params, document);
    } catch (error) {
        connection.console.error(`Hover failed: ${error}`);
        return null;
    }
});

// This handler provides document symbols (outline)
connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];
    try {
        // Adapt MySymbol to DocumentSymbol
        const mySymbols = parseDocumentSymbols(document);
        return mySymbols.map(s => ({
            name: s.name,
            kind: s.kind,
            range: s.range,
            selectionRange: s.selectionRange,
            detail: s.detail
        }));
    } catch (error) {
        connection.console.error(`DocumentSymbol failed: ${error}`);
        return [];
    }
});

// This handler provides folding ranges
connection.onFoldingRanges((params: FoldingRangeParams): FoldingRange[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];
    try {
        return onFoldingRanges(params, document);
    } catch (error) {
        connection.console.error(`FoldingRanges failed: ${error}`);
        return [];
    }
});

// This handler provides definition lookup
connection.onDefinition((params: DefinitionParams): Definition | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;
    try {
        return onDefinition(params, document);
    } catch (error) {
        connection.console.error(`Definition failed: ${error}`);
        return null;
    }
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
