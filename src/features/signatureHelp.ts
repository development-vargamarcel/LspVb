import {
    SignatureHelp,
    SignatureHelpParams,
    ParameterInformation
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { parseDocumentSymbols, findSymbolInScope, findGlobalSymbol } from '../utils/parser';
import { BUILTINS } from '../builtins';

/**
 * Handles signature help requests.
 * Provides parameter hints for function calls.
 *
 * @param params The signature help parameters.
 * @param document The text document.
 * @param allDocuments Optional list of all open documents.
 * @returns A SignatureHelp object or null.
 */
export function onSignatureHelp(
    params: SignatureHelpParams,
    document: TextDocument,
    allDocuments: TextDocument[] = [document]
): SignatureHelp | null {
    Logger.log(`Signature help requested at ${params.position.line}:${params.position.character}`);
    const text = document.getText();
    const offset = document.offsetAt(params.position);

    // Scan backwards to find the function call
    // We are looking for "Name(" where Name matches a known symbol.
    // This is a naive implementation.

    let i = offset - 1;
    let nestingLevel = 0;

    while (i >= 0) {
        const char = text[i];

        if (char === ')') {
            nestingLevel++;
        } else if (char === '(') {
            if (nestingLevel > 0) {
                nestingLevel--;
            } else {
                // Found the opening parenthesis of the call
                // Now find the name before it
                const nameEnd = i;
                let nameStart = i;
                // Skip whitespace
                while (nameStart > 0 && /\s/.test(text[nameStart - 1])) {
                    nameStart--;
                }
                // Read Name
                const actualNameEnd = nameStart;
                while (nameStart > 0 && /[\w]/.test(text[nameStart - 1])) {
                    nameStart--;
                }

                const functionName = text.substring(nameStart, actualNameEnd);

                if (functionName) {
                    Logger.debug(`SignatureHelp: Identified function call '${functionName}'.`);

                    // Determine active parameter
                    let activeParameter = 0;
                    let innerLevel = 0;
                    for (let j = nameEnd + 1; j < offset; j++) {
                        const c = text[j];
                        if (c === '(') innerLevel++;
                        else if (c === ')') innerLevel--;
                        else if (c === ',' && innerLevel === 0) activeParameter++;
                    }

                    // 1. Check Built-ins
                    const builtin = BUILTINS[functionName.toLowerCase()];
                    if (builtin) {
                        Logger.debug(`SignatureHelp: Found builtin '${functionName}'.`);
                        return {
                            signatures: [
                                {
                                    label: builtin.detail,
                                    documentation: builtin.documentation,
                                    parameters: builtin.parameters || []
                                }
                            ],
                            activeSignature: 0,
                            activeParameter: activeParameter
                        };
                    }

                    // 2. Check User Symbols
                    const symbols = parseDocumentSymbols(document);
                    let symbol = findSymbolInScope(
                        symbols,
                        functionName.toLowerCase(),
                        params.position
                    );

                    // 3. Check Global Symbols (Other Documents)
                    if (!symbol && allDocuments.length > 0) {
                        for (const doc of allDocuments) {
                            if (doc.uri === document.uri) continue;
                            const docSymbols = parseDocumentSymbols(doc);
                            const found = findGlobalSymbol(docSymbols, functionName.toLowerCase());
                            if (found) {
                                symbol = found;
                                break;
                            }
                        }
                    }

                    if (
                        symbol &&
                        symbol.detail &&
                        (symbol.detail.startsWith('Sub') || symbol.detail.startsWith('Function'))
                    ) {
                        Logger.debug('SignatureHelp: Found symbol definition.');
                        // detail format is "Sub(arg1, arg2)" or "Function(args)"
                        // We need to parse detail to get label and parameters.

                        // detail: "Sub(x As Integer, y As String)"
                        const label = `${symbol.name}${symbol.detail.substring(symbol.detail.indexOf('('))}`;
                        const documentation = `Signature for ${symbol.name}`;

                        // Parse parameters from detail
                        const paramString = symbol.detail.substring(
                            symbol.detail.indexOf('(') + 1,
                            symbol.detail.lastIndexOf(')')
                        );
                        const parameters: ParameterInformation[] = [];

                        if (paramString.trim()) {
                            const paramsList = paramString.split(',');
                            for (const p of paramsList) {
                                parameters.push({
                                    label: p.trim()
                                });
                            }
                        }

                        return {
                            signatures: [
                                {
                                    label: label,
                                    documentation: documentation,
                                    parameters: parameters
                                }
                            ],
                            activeSignature: 0,
                            activeParameter: activeParameter
                        };
                    }
                }
                break; // Stop after finding the first open paren
            }
        }
        i--;
    }

    Logger.debug('SignatureHelp: No signature found.');
    return null;
}
