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

                        // Use parsed children to get accurate parameters (including complex types)
                        const parameters: ParameterInformation[] = [];
                        if (symbol.children) {
                            for (const child of symbol.children) {
                                // Parser marks arguments with "Argument" prefix in detail
                                if (child.detail && child.detail.startsWith('Argument')) {
                                    // Extract "x As Integer" from "Argument x As Integer"
                                    const paramLabel = child.detail.substring('Argument '.length);
                                    parameters.push({
                                        label: paramLabel,
                                        documentation: child.detail
                                    });
                                }
                            }
                        }

                        // Fallback to parsing string if children approach yielded nothing but signature implies args
                        // (Legacy support or if parser behavior changes)
                        if (parameters.length === 0 && symbol.detail.includes('(')) {
                             const paramString = symbol.detail.substring(
                                symbol.detail.indexOf('(') + 1,
                                symbol.detail.lastIndexOf(')')
                            );
                            if (paramString.trim()) {
                                const paramsList = paramString.split(',');
                                for (const p of paramsList) {
                                    parameters.push({
                                        label: p.trim()
                                    });
                                }
                            }
                        }

                        // Reconstruct label from parameters for consistent display
                        const paramsLabel = parameters.map(p => p.label).join(', ');
                        const label = `${symbol.name}(${paramsLabel})`;
                        const documentation = `Signature for ${symbol.name}`;

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
