import { InlayHint, InlayHintParams, InlayHintKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { parseDocumentSymbols, findSymbolInScope } from '../utils/parser';

/**
 * Handles Inlay Hints requests.
 * Scans the document for function calls and provides parameter name hints.
 *
 * @param params The inlay hint parameters.
 * @param document The text document.
 * @returns An array of InlayHint objects.
 */
export function onInlayHints(params: InlayHintParams, document: TextDocument): InlayHint[] {
    Logger.log(`Inlay Hints requested for ${document.uri}`);
    const text = document.getText();
    const hints: InlayHint[] = [];
    const symbols = parseDocumentSymbols(document);

    // Regex to find function calls: Identifier followed by (
    // This is a heuristic and might produce false positives/negatives
    const callRegex = /\b(\w+)\s*\(/g;
    let match;

    while ((match = callRegex.exec(text)) !== null) {
        const functionName = match[1];
        const startOffset = match.index;
        const openParenOffset = startOffset + match[0].length - 1; // Index of '('

        // 1. Resolve the symbol
        const position = document.positionAt(startOffset);
        const symbol = findSymbolInScope(symbols, functionName, position);

        // Skip if we are at the definition site
        if (
            symbol &&
            symbol.selectionRange.start.line === position.line &&
            symbol.selectionRange.start.character === position.character
        ) {
            continue;
        }

        if (
            symbol &&
            symbol.detail &&
            (symbol.detail.startsWith('Sub') || symbol.detail.startsWith('Function'))
        ) {
            // Parse definition parameters
            // detail: "Sub(x As Integer, y As String)"
            const paramStart = symbol.detail.indexOf('(');
            const paramEnd = symbol.detail.lastIndexOf(')');
            if (paramStart === -1 || paramEnd === -1) continue;

            const paramString = symbol.detail.substring(paramStart + 1, paramEnd);
            if (!paramString.trim()) continue;

            // Split paramString by comma, respecting parentheses
            const paramsList: string[] = [];
            let currentParam = '';
            let depth = 0;
            for (let j = 0; j < paramString.length; j++) {
                const char = paramString[j];
                if (char === '(') depth++;
                else if (char === ')') depth--;

                if (char === ',' && depth === 0) {
                    paramsList.push(currentParam);
                    currentParam = '';
                } else {
                    currentParam += char;
                }
            }
            paramsList.push(currentParam);

            const paramLabels = paramsList.map((p) => {
                // "x As List(Of Integer)" -> "x"
                // "ByVal x As Integer" -> "x"
                // Regex to capture name, ignoring modifiers
                const match = /^(?:ByVal|ByRef|Optional|ParamArray)?\s*(\w+)/i.exec(p.trim());
                if (match) {
                    return match[1] + ':';
                }
                const parts = p.trim().split(/\s+/);
                return parts[0] + ':';
            });

            // Parse arguments in the call
            // We need to match parens to find arguments
            // This is a simplified parser
            let currentArgIndex = 0;
            let parenDepth = 1; // We are inside the first (
            let currentArgStart = openParenOffset + 1;
            let i = openParenOffset + 1;
            let inString = false;

            while (i < text.length && parenDepth > 0) {
                const char = text[i];

                if (char === '"') {
                    inString = !inString;
                } else if (char === "'" && !inString) {
                    // Comment started, skip to end of line
                    const eolIndex = text.indexOf('\n', i);
                    if (eolIndex !== -1) {
                        i = eolIndex;
                        continue; // Proceed to next char (newline)
                    } else {
                        break; // End of file
                    }
                }

                if (!inString) {
                    if (char === '(') parenDepth++;
                    else if (char === ')') parenDepth--;
                    else if (char === ',' && parenDepth === 1) {
                        // End of argument
                        if (currentArgIndex < paramLabels.length) {
                            const argStartPos = document.positionAt(currentArgStart);
                            // Don't add hint if argument is empty
                            if (text.substring(currentArgStart, i).trim()) {
                                hints.push({
                                    position: argStartPos,
                                    label: paramLabels[currentArgIndex],
                                    kind: InlayHintKind.Parameter,
                                    paddingRight: true
                                });
                            }
                        }
                        currentArgIndex++;
                        currentArgStart = i + 1;
                    }
                }
                i++;
            }

            // Last argument
            if (currentArgIndex < paramLabels.length) {
                // i is now at closing ')'
                // Check if there is content between last comma (or open paren) and closing paren
                if (text.substring(currentArgStart, i).trim()) {
                    const argStartPos = document.positionAt(currentArgStart);
                    hints.push({
                        position: argStartPos,
                        label: paramLabels[currentArgIndex],
                        kind: InlayHintKind.Parameter,
                        paddingRight: true
                    });
                }
            }
        }
    }

    Logger.debug(`InlayHints: Found ${hints.length} hints.`);
    return hints;
}
