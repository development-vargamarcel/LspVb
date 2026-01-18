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
	InitializeResult,
    Hover,
    HoverParams,
    MarkupKind,
    DocumentSymbol,
    SymbolKind,
    DocumentSymbolParams,
    FoldingRange,
    FoldingRangeParams
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

// Define keyword documentation map
const KEYWORDS: Record<string, { label: string; detail: string; documentation: string; kind: CompletionItemKind }> = {
    'dim': { label: 'Dim', detail: 'Dim keyword', documentation: 'Declares and allocates storage space for one or more variables.', kind: CompletionItemKind.Keyword },
    'if': { label: 'If', detail: 'If keyword', documentation: 'Conditionally executes a group of statements, depending on the value of an expression.', kind: CompletionItemKind.Keyword },
    'then': { label: 'Then', detail: 'Then keyword', documentation: 'Introduces a statement block to be compiled or executed.', kind: CompletionItemKind.Keyword },
    'else': { label: 'Else', detail: 'Else keyword', documentation: 'Introduces a statement block to be compiled or executed if the condition is False.', kind: CompletionItemKind.Keyword },
    'end if': { label: 'End If', detail: 'End If keyword', documentation: 'Ends an If...Then...Else block.', kind: CompletionItemKind.Keyword },
    'sub': { label: 'Sub', detail: 'Sub keyword', documentation: 'Declares the name, parameters, and code that define a Sub procedure.', kind: CompletionItemKind.Keyword },
    'function': { label: 'Function', detail: 'Function keyword', documentation: 'Declares the name, parameters, and code that define a Function procedure.', kind: CompletionItemKind.Keyword },
    'end sub': { label: 'End Sub', detail: 'End Sub keyword', documentation: 'Terminates the definition of this procedure.', kind: CompletionItemKind.Keyword },
    'end function': { label: 'End Function', detail: 'End Function keyword', documentation: 'Terminates the definition of this procedure.', kind: CompletionItemKind.Keyword },
    'for': { label: 'For', detail: 'For keyword', documentation: 'Repeats a group of statements a specified number of times.', kind: CompletionItemKind.Keyword },
    'next': { label: 'Next', detail: 'Next keyword', documentation: 'Ends a For...Next loop.', kind: CompletionItemKind.Keyword },
    'while': { label: 'While', detail: 'While keyword', documentation: 'Executes a series of statements as long as a given condition is True.', kind: CompletionItemKind.Keyword },
    'wend': { label: 'Wend', detail: 'Wend keyword', documentation: 'Ends a While...Wend loop.', kind: CompletionItemKind.Keyword },
    'do': { label: 'Do', detail: 'Do keyword', documentation: 'Repeats a block of statements while a Boolean condition is True or until the condition becomes True.', kind: CompletionItemKind.Keyword },
    'loop': { label: 'Loop', detail: 'Loop keyword', documentation: 'Ends a Do...Loop.', kind: CompletionItemKind.Keyword },
    'as': { label: 'As', detail: 'As keyword', documentation: 'Used in a Dim, ReDim, Static, Private, Public, or Const statement to declare the data type of a variable.', kind: CompletionItemKind.Keyword },
    'integer': { label: 'Integer', detail: 'Integer data type', documentation: 'Holds signed 32-bit (4-byte) integers ranging in value from -2,147,483,648 through 2,147,483,647.', kind: CompletionItemKind.Class },
    'string': { label: 'String', detail: 'String data type', documentation: 'Holds sequences of unsigned 16-bit (2-byte) code points ranging in value from 0 through 65535.', kind: CompletionItemKind.Class },
    'boolean': { label: 'Boolean', detail: 'Boolean data type', documentation: 'Holds values that can be only True or False.', kind: CompletionItemKind.Class },
    'double': { label: 'Double', detail: 'Double data type', documentation: 'Holds signed IEEE 64-bit (8-byte) double-precision floating-point numbers.', kind: CompletionItemKind.Class },
    'date': { label: 'Date', detail: 'Date data type', documentation: 'Holds IEEE 64-bit (8-byte) values that represent dates ranging from January 1 of the year 0001 through December 31 of the year 9999.', kind: CompletionItemKind.Class },
    'long': { label: 'Long', detail: 'Long data type', documentation: 'Holds signed 64-bit (8-byte) integers ranging in value from -9,223,372,036,854,775,808 through 9,223,372,036,854,775,807.', kind: CompletionItemKind.Class },
    'byte': { label: 'Byte', detail: 'Byte data type', documentation: 'Holds unsigned 8-bit (1-byte) integers ranging in value from 0 through 255.', kind: CompletionItemKind.Class },
    'object': { label: 'Object', detail: 'Object data type', documentation: 'Points to any object.', kind: CompletionItemKind.Class },
    'public': { label: 'Public', detail: 'Public keyword', documentation: 'Specifies that one or more declared programming elements have no access restrictions.', kind: CompletionItemKind.Keyword },
    'private': { label: 'Private', detail: 'Private keyword', documentation: 'Specifies that one or more declared programming elements are accessible only from within their declaration context.', kind: CompletionItemKind.Keyword },
    'const': { label: 'Const', detail: 'Const keyword', documentation: 'Declares and defines one or more constants.', kind: CompletionItemKind.Keyword },
    'true': { label: 'True', detail: 'True literal', documentation: 'Represents a Boolean value.', kind: CompletionItemKind.Keyword },
    'false': { label: 'False', detail: 'False literal', documentation: 'Represents a Boolean value.', kind: CompletionItemKind.Keyword },
    'new': { label: 'New', detail: 'New keyword', documentation: 'Creates a new object instance.', kind: CompletionItemKind.Keyword }
};

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
            foldingRangeProvider: true
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

    // Check for Const declaration without initialization
    // Matches "Const Name [As Type]" with nothing else (no = Value)
    const constRegex = /^\s*(?:(Public|Private|Friend|Protected)\s+)?Const\s+(\w+)(?:\s+As\s+(\w+))?\s*(?:'.*)?$/gmi;
    while ((m = constRegex.exec(text))) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: {
                start: textDocument.positionAt(m.index),
                end: textDocument.positionAt(m.index + m[0].length)
            },
            message: "Const declaration requires a value (e.g. Const x = 1).",
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
		// Generate completion items from KEYWORDS map
        const items: CompletionItem[] = [];
        for (const key in KEYWORDS) {
            const val = KEYWORDS[key];
            items.push({
                label: val.label,
                kind: val.kind,
                data: key // Store the lowercase key as data to lookup in resolve
            });
        }
        return items;
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
        const data = item.data as string;
        if (KEYWORDS[data]) {
            item.detail = KEYWORDS[data].detail;
            item.documentation = KEYWORDS[data].documentation;
        }
		return item;
	}
);

// This handler provides hover information.
connection.onHover((params: HoverParams): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    // Naive word extraction: get line, check word at position
    const position = params.position;
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Simple logic to identify word boundaries around the cursor
    let start = offset;
    while (start > 0 && /\w/.test(text.charAt(start - 1))) {
        start--;
    }

    let end = offset;
    while (end < text.length && /\w/.test(text.charAt(end))) {
        end++;
    }

    if (start === end) {
        return null;
    }

    const word = text.substring(start, end);
    const lowerWord = word.toLowerCase();

    // Check if the word is in our KEYWORDS map
    let keywordData = KEYWORDS[lowerWord];

    if (keywordData) {
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: `**${keywordData.detail}**\n\n${keywordData.documentation}`
            }
        };
    }

    return null;
});

// This handler provides document symbols (outline)
connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    const text = document.getText();
    const symbols: DocumentSymbol[] = [];

    // Regex to find Sub and Function definitions
    // Matches: [Public|Private] Sub|Function|Class|Module Name
    const regex = /^\s*(?:(Public|Private|Friend|Protected)\s+)?(Sub|Function|Class|Module)\s+(\w+)/gm;
    let m: RegExpExecArray | null;

    while ((m = regex.exec(text))) {
        const type = m[2]; // Sub, Function, Class, Module
        const name = m[3];

        let kind: SymbolKind = SymbolKind.Function;
        if (type === 'Sub') kind = SymbolKind.Method;
        if (type === 'Class') kind = SymbolKind.Class;
        if (type === 'Module') kind = SymbolKind.Module;

        // For range, we'll just use the definition line for now
        const range = {
            start: document.positionAt(m.index),
            end: document.positionAt(m.index + m[0].length)
        };
        const selectionRange = {
            start: document.positionAt(m.index + m[0].lastIndexOf(name)),
            end: document.positionAt(m.index + m[0].lastIndexOf(name) + name.length)
        };

        symbols.push({
            name: name,
            kind: kind,
            range: range,
            selectionRange: selectionRange,
            detail: type
        });
    }
    return symbols;
});

// This handler provides folding ranges
connection.onFoldingRanges((params: FoldingRangeParams): FoldingRange[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const ranges: FoldingRange[] = [];
    const stack: { line: number, type: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
        // Remove comments for analysis
        const rawLine = lines[i];
        const line = rawLine.split("'")[0].trim();
        if (!line) continue;

        // Check for block ends
        let endMatch = false;
        if (/^End\s+(Sub|Function|If|Class|Module)/i.test(line)) endMatch = true;
        else if (/^Next(\s+|$)/i.test(line)) endMatch = true;
        else if (/^Wend(\s+|$)/i.test(line)) endMatch = true;
        else if (/^Loop(\s+|$)/i.test(line)) endMatch = true;

        if (endMatch) {
            if (stack.length > 0) {
                 const start = stack.pop();
                 if (start) {
                     // Fold from start line to current line - 1
                     // (Keep the End line visible)
                     ranges.push({
                         startLine: start.line,
                         endLine: i - 1
                     });
                 }
            }
            // End line cannot be a start line (unless mixed, which is bad style)
            continue;
        }

        // Check for block starts
        let startType: string | null = null;

        if (/^(?:(Public|Private|Friend|Protected)\s+)?(Sub|Function|Class|Module)\b/i.test(line)) {
            startType = 'block';
        } else if (/^If\b.*?\bThen\s*$/i.test(line)) {
             // Block If check: If ... Then (and nothing else on line)
             startType = 'if';
        } else if (/^For\b/i.test(line)) {
             startType = 'for';
        } else if (/^While\b/i.test(line)) {
             startType = 'while';
        } else if (/^Do\b/i.test(line)) {
             startType = 'do';
        }

        if (startType) {
            stack.push({ line: i, type: startType });
        }
    }

    return ranges;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
