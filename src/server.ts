import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	TextDocumentPositionParams,
	InitializeResult,
    Hover,
    HoverParams,
    DocumentSymbol,
    DocumentSymbolParams,
    FoldingRange,
    FoldingRangeParams,
    DefinitionParams,
    Definition,
    ReferenceParams,
    RenameParams,
    WorkspaceEdit,
    Location,
    DocumentFormattingParams,
    TextEdit,
    CodeActionParams,
    CodeAction,
    Command,
    SignatureHelpParams,
    SignatureHelp
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import { onCompletion, onCompletionResolve } from './features/completion';
import { onHover } from './features/hover';
import { onFoldingRanges } from './features/folding';
import { onDefinition } from './features/definition';
import { onReferences } from './features/references';
import { onRenameRequest } from './features/rename';
import { onCodeAction } from './features/codeAction';
import { onSignatureHelp } from './features/signatureHelp';
import { parseDocumentSymbols } from './utils/parser';
import { formatDocument } from './features/formatting';
import { Logger } from './utils/logger';
import { ValidationScheduler } from './utils/scheduler';
import { safeHandler } from './utils/safeHandler';
import { SERVER_CAPABILITIES } from './server-capabilities';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);
Logger.setConnection(connection);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Validation Scheduler
const validationScheduler = new ValidationScheduler(connection);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
    Logger.log('Initializing SimpleVB Language Server...');
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);

	const result: InitializeResult = {
		capabilities: SERVER_CAPABILITIES
	};

	return result;
});

connection.onInitialized(() => {
    Logger.log('Server initialized.');
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			Logger.log('Workspace folder change event received.');
		});
	}
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    validationScheduler.scheduleValidation(change.document);
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	Logger.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	safeHandler((params: TextDocumentPositionParams): CompletionItem[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Completion requested at ${params.textDocument.uri}:${params.position.line}`);
        return onCompletion(params, document);
    }, [], 'Completion')
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	safeHandler((item: CompletionItem): CompletionItem => {
        return onCompletionResolve(item);
	}, {} as CompletionItem, 'CompletionResolve')
);

// This handler provides hover information.
connection.onHover(
    safeHandler((params: HoverParams): Hover | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        return onHover(params, document);
    }, null, 'Hover')
);

// This handler provides document symbols (outline)
connection.onDocumentSymbol(
    safeHandler((params: DocumentSymbolParams): DocumentSymbol[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        return parseDocumentSymbols(document);
    }, [], 'DocumentSymbol')
);

// This handler provides folding ranges
connection.onFoldingRanges(
    safeHandler((params: FoldingRangeParams): FoldingRange[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        return onFoldingRanges(params, document);
    }, [], 'FoldingRanges')
);

// This handler provides definition lookup
connection.onDefinition(
    safeHandler((params: DefinitionParams): Definition | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        return onDefinition(params, document);
    }, null, 'Definition')
);

// This handler provides references lookup
connection.onReferences(
    safeHandler((params: ReferenceParams): Location[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        return onReferences(params, document);
    }, [], 'References')
);

// This handler provides rename support
connection.onRenameRequest(
    safeHandler((params: RenameParams): WorkspaceEdit | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        return onRenameRequest(params, document);
    }, null, 'Rename')
);

// This handler provides code actions
connection.onCodeAction(
    safeHandler((params: CodeActionParams): (Command | CodeAction)[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        return onCodeAction(params, document);
    }, [], 'CodeAction')
);

// This handler provides signature help
connection.onSignatureHelp(
    safeHandler((params: SignatureHelpParams): SignatureHelp | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        return onSignatureHelp(params, document);
    }, null, 'SignatureHelp')
);

// This handler provides formatting
connection.onDocumentFormatting(
    safeHandler((params: DocumentFormattingParams): TextEdit[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Formatting requested for ${params.textDocument.uri}`);
        return formatDocument(document, params.options);
    }, [], 'Formatting')
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
