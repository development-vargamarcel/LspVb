import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
    // console.log("DEBUG: onInitialize called"); // cannot log to stdout, it will break protocol
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
			}
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

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const text = textDocument.getText();
	const pattern = /\b[a-z]{2,}\b/g; // Warn about lowercase words (VB is usually PascalCase/uppercase mostly)
    // Actually, let's do something more specific to VB.
    // Let's check for missing 'Then' in 'If' statements.

	let m: RegExpExecArray | null;

    const diagnostics: Diagnostic[] = [];

    // Simple regex for "If ... " without "Then" on the same line (very naive)
    // Matches "If " followed by anything that is NOT "Then" and then end of line.
    // This is fragile but illustrative.
    const ifRegex = /^\s*If\s+.*$/gm;
    while ((m = ifRegex.exec(text))) {
        const line = m[0];
        if (!/\bThen\b/i.test(line) && !line.trim().endsWith("_")) { // Allow line continuation
             // Check if it is a single line If or block If.
             // Actually, "If condition Then" is standard. "If condition" is invalid without Then.
             const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: {
                    start: textDocument.positionAt(m.index),
                    end: textDocument.positionAt(m.index + m[0].length)
                },
                message: "Missing 'Then' in If statement.",
                source: 'SimpleVB'
            };
            diagnostics.push(diagnostic);
        }
    }

    // Another simple check: "Dim x" -> "Dim x As ..." warning
    const dimRegex = /^\s*Dim\s+\w+\s*$/gm;
    while ((m = dimRegex.exec(text))) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Warning,
            range: {
                start: textDocument.positionAt(m.index),
                end: textDocument.positionAt(m.index + m[0].length)
            },
            message: "Variable declaration without type (As ...).",
            source: 'SimpleVB'
        };
        diagnostics.push(diagnostic);
    }

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'Dim',
				kind: CompletionItemKind.Keyword,
				data: 1
			},
			{
				label: 'If',
				kind: CompletionItemKind.Keyword,
				data: 2
			},
            {
				label: 'Then',
				kind: CompletionItemKind.Keyword,
				data: 3
			},
            {
				label: 'Else',
				kind: CompletionItemKind.Keyword,
				data: 4
			},
            {
				label: 'End If',
				kind: CompletionItemKind.Keyword,
				data: 5
			},
            {
				label: 'Sub',
				kind: CompletionItemKind.Keyword,
				data: 6
			},
            {
				label: 'Function',
				kind: CompletionItemKind.Keyword,
				data: 7
			},
            {
				label: 'End Sub',
				kind: CompletionItemKind.Keyword,
				data: 8
			},
            {
				label: 'End Function',
				kind: CompletionItemKind.Keyword,
				data: 9
			},
             {
				label: 'For',
				kind: CompletionItemKind.Keyword,
				data: 10
			},
             {
				label: 'Next',
				kind: CompletionItemKind.Keyword,
				data: 11
			},
             {
				label: 'While',
				kind: CompletionItemKind.Keyword,
				data: 12
			},
             {
				label: 'Wend',
				kind: CompletionItemKind.Keyword,
				data: 13
			},
             {
				label: 'Do',
				kind: CompletionItemKind.Keyword,
				data: 14
			},
             {
				label: 'Loop',
				kind: CompletionItemKind.Keyword,
				data: 15
			},
            {
				label: 'As',
				kind: CompletionItemKind.Keyword,
				data: 16
			},
             {
				label: 'Integer',
				kind: CompletionItemKind.TypeParameter, // or Class/Interface
				data: 17
			},
             {
				label: 'String',
				kind: CompletionItemKind.TypeParameter,
				data: 18
			},
             {
				label: 'Boolean',
				kind: CompletionItemKind.TypeParameter,
				data: 19
			}
		];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'Dim keyword';
			item.documentation = 'Declares and allocates storage space for one or more variables.';
		} else if (item.data === 2) {
			item.detail = 'If keyword';
			item.documentation = 'Conditionally executes a group of statements, depending on the value of an expression.';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
