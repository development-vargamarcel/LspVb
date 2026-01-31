/**
 * Main entry point for the SimpleVB Language Server.
 * Handles LSP connection setup, feature registration, and event delegation.
 *
 * This file:
 * 1. Establishes the connection using `vscode-languageserver`.
 * 2. Initializes the `ValidationScheduler` for linting.
 * 3. Registers handlers for various LSP features (completion, hover, etc.).
 * 4. Listens for document changes.
 */
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
    PrepareRenameParams,
    WorkspaceEdit,
    Location,
    ImplementationParams,
    DocumentFormattingParams,
    DocumentRangeFormattingParams,
    DocumentOnTypeFormattingParams,
    TextEdit,
    CodeActionParams,
    CodeAction,
    Command,
    SignatureHelpParams,
    SignatureHelp,
    SemanticTokensParams,
    SemanticTokens,
    DocumentHighlightParams,
    DocumentHighlight,
    InlayHintParams,
    InlayHint,
    CodeLensParams,
    CodeLens,
    WorkspaceSymbolParams,
    SymbolInformation,
    SelectionRangeParams,
    SelectionRange,
    Range,
    CallHierarchyPrepareParams,
    CallHierarchyIncomingCallsParams,
    CallHierarchyOutgoingCallsParams,
    CallHierarchyItem,
    CallHierarchyIncomingCall,
    CallHierarchyOutgoingCall,
    ColorInformation,
    DocumentColorParams,
    ColorPresentation,
    ColorPresentationParams
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import { onDocumentColor, onColorPresentation } from './features/colorProvider';
import { onPrepareCallHierarchy, onIncomingCalls, onOutgoingCalls } from './features/callHierarchy';
import { onCompletion, onCompletionResolve } from './features/completion';
import { onHover } from './features/hover';
import { onFoldingRanges } from './features/folding';
import { onDefinition } from './features/definition';
import { onImplementation } from './features/implementation';
import { onTypeDefinition } from './features/typeDefinition';
import { onReferences } from './features/references';
import { onRenameRequest } from './features/rename';
import { onPrepareRename } from './features/prepareRename';
import { onCodeAction } from './features/codeAction';
import { onSignatureHelp } from './features/signatureHelp';
import { onSemanticTokens } from './features/semanticTokens';
import { onDocumentHighlight } from './features/documentHighlight';
import { onInlayHints } from './features/inlayHints';
import { onCodeLens, onCodeLensResolve } from './features/codeLens';
import { onWorkspaceSymbol } from './features/workspaceSymbol';
import { onSelectionRanges } from './features/selectionRange';
import { parseDocumentSymbols } from './utils/parser';
import { formatDocument, formatRange, formatOnType } from './features/formatting';
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
const validationScheduler = new ValidationScheduler(connection, documents);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize(
    safeHandler((params: InitializeParams) => {
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

        Logger.debug(`Capabilities sent: ${JSON.stringify(SERVER_CAPABILITIES)}`);

        return result;
    }, { capabilities: SERVER_CAPABILITIES }, 'Initialize')
);

connection.onInitialized(
    safeHandler(() => {
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
    }, undefined, 'Initialized')
);

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(
    safeHandler(change => {
        validationScheduler.scheduleValidation(change.document);
    }, undefined, 'DidChangeContent')
);

connection.onDidChangeWatchedFiles(
    safeHandler(_change => {
        // Monitored files have change in VSCode
        Logger.log('We received an file change event');
    }, undefined, 'DidChangeWatchedFiles')
);

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
        Logger.log(`Hover requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`);
        return onHover(params, document, documents.all());
    }, null, 'Hover')
);

// This handler provides document symbols (outline)
connection.onDocumentSymbol(
    safeHandler((params: DocumentSymbolParams): DocumentSymbol[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Document Symbols requested for ${params.textDocument.uri}`);
        return parseDocumentSymbols(document);
    }, [], 'DocumentSymbol')
);

// This handler provides folding ranges
connection.onFoldingRanges(
    safeHandler((params: FoldingRangeParams): FoldingRange[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Folding Ranges requested for ${params.textDocument.uri}`);
        return onFoldingRanges(params, document);
    }, [], 'FoldingRanges')
);

// This handler provides definition lookup
connection.onDefinition(
    safeHandler((params: DefinitionParams): Definition | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        Logger.log(`Definition requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`);
        return onDefinition(params, document, documents.all());
    }, null, 'Definition')
);

// This handler provides implementation lookup
connection.onImplementation(
    safeHandler((params: ImplementationParams): Location[] | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        Logger.log(`Implementation requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`);
        return onImplementation(params, document, documents.all());
    }, null, 'Implementation')
);

// Call Hierarchy
connection.languages.callHierarchy.onPrepare(
    safeHandler((params: CallHierarchyPrepareParams): CallHierarchyItem[] | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        return onPrepareCallHierarchy(params, document);
    }, null, 'CallHierarchyPrepare')
);

connection.languages.callHierarchy.onIncomingCalls(
    safeHandler((params: CallHierarchyIncomingCallsParams): CallHierarchyIncomingCall[] | null => {
        return onIncomingCalls(params, documents.all());
    }, null, 'CallHierarchyIncomingCalls')
);

connection.languages.callHierarchy.onOutgoingCalls(
    safeHandler((params: CallHierarchyOutgoingCallsParams): CallHierarchyOutgoingCall[] | null => {
        return onOutgoingCalls(params, documents.all());
    }, null, 'CallHierarchyOutgoingCalls')
);

// This handler provides type definition lookup
connection.onTypeDefinition(
    safeHandler((params: DefinitionParams): Definition | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        Logger.log(`Type Definition requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`);
        return onTypeDefinition(params, document);
    }, null, 'TypeDefinition')
);

// This handler provides references lookup
connection.onReferences(
    safeHandler((params: ReferenceParams): Location[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`References requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`);
        return onReferences(params, document, documents.all());
    }, [], 'References')
);

// This handler provides document highlight
connection.onDocumentHighlight(
    safeHandler((params: DocumentHighlightParams): DocumentHighlight[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Document Highlight requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`);
        return onDocumentHighlight(params, document);
    }, [], 'DocumentHighlight')
);

// This handler provides rename support
connection.onRenameRequest(
    safeHandler((params: RenameParams): WorkspaceEdit | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        Logger.log(`Rename requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character} to '${params.newName}'`);
        return onRenameRequest(params, document, documents.all());
    }, null, 'Rename')
);

// This handler provides prepare rename
connection.onPrepareRename(
    safeHandler((params: PrepareRenameParams): Range | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        return onPrepareRename(params, document);
    }, null, 'PrepareRename')
);

// This handler provides code actions
connection.onCodeAction(
    safeHandler((params: CodeActionParams): (Command | CodeAction)[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Code Action requested for ${params.textDocument.uri}`);
        return onCodeAction(params, document);
    }, [], 'CodeAction')
);

// This handler provides signature help
connection.onSignatureHelp(
    safeHandler((params: SignatureHelpParams): SignatureHelp | null => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        Logger.log(`Signature Help requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`);
        return onSignatureHelp(params, document, documents.all());
    }, null, 'SignatureHelp')
);

// This handler provides semantic tokens
connection.languages.semanticTokens.on(
    safeHandler((params: SemanticTokensParams): SemanticTokens => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return { data: [] };
        Logger.log(`Semantic Tokens requested for ${params.textDocument.uri}`);
        return onSemanticTokens(params, document);
    }, { data: [] }, 'SemanticTokens')
);

// This handler provides inlay hints
connection.languages.inlayHint.on(
    safeHandler((params: InlayHintParams): InlayHint[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Inlay Hints requested for ${params.textDocument.uri}`);
        return onInlayHints(params, document);
    }, [], 'InlayHints')
);

// This handler provides selection ranges
connection.onSelectionRanges(
    safeHandler((params: SelectionRangeParams): SelectionRange[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        // Logging inside handler
        return onSelectionRanges(params, document);
    }, [], 'SelectionRanges')
);

// This handler provides workspace symbols
connection.onWorkspaceSymbol(
    safeHandler((params: WorkspaceSymbolParams): SymbolInformation[] => {
        Logger.log(`Workspace Symbol requested for query '${params.query}'`);
        return onWorkspaceSymbol(params, documents.all());
    }, [], 'WorkspaceSymbol')
);

// This handler provides code lens
connection.onCodeLens(
    safeHandler((params: CodeLensParams): CodeLens[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`CodeLens requested for ${params.textDocument.uri}`);
        return onCodeLens(params, document);
    }, [], 'CodeLens')
);

// This handler resolves code lens
connection.onCodeLensResolve(
    (codeLens: CodeLens): CodeLens => {
        const start = Date.now();
        Logger.debug(`[CodeLensResolve] Started`);
        try {
            const data = codeLens.data;
            if (data && data.uri) {
                const document = documents.get(data.uri);
                if (document) {
                    const result = onCodeLensResolve(codeLens, document, documents.all());
                    const duration = Date.now() - start;
                    Logger.debug(`[CodeLensResolve] Finished in ${duration}ms`);
                    return result;
                }
            }
            return codeLens;
        } catch (error) {
            Logger.error(`CodeLensResolve failed: ${error}`);
            return codeLens;
        }
    }
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

// This handler provides range formatting
connection.onDocumentRangeFormatting(
    safeHandler((params: DocumentRangeFormattingParams): TextEdit[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Range Formatting requested for ${params.textDocument.uri}`);
        return formatRange(document, params.range, params.options);
    }, [], 'RangeFormatting')
);

// This handler provides on type formatting
connection.onDocumentOnTypeFormatting(
    safeHandler((params: DocumentOnTypeFormattingParams): TextEdit[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        return formatOnType(document, params);
    }, [], 'OnTypeFormatting')
);

// This handler provides document colors
connection.onDocumentColor(
    safeHandler((params: DocumentColorParams): ColorInformation[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Document Color requested for ${params.textDocument.uri}`);
        return onDocumentColor(params, document);
    }, [], 'DocumentColor')
);

// This handler provides color presentations
connection.onColorPresentation(
    safeHandler((params: ColorPresentationParams): ColorPresentation[] => {
        const document = documents.get(params.textDocument.uri);
        if (!document) return [];
        Logger.log(`Color Presentation requested for ${params.textDocument.uri}`);
        return onColorPresentation(params, document);
    }, [], 'ColorPresentation')
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
