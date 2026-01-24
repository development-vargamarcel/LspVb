import {
    SignatureHelp,
    SignatureHelpParams,
    SignatureInformation,
    ParameterInformation
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols, findSymbolInScope } from '../utils/parser';

/**
 * Handles signature help requests.
 * Provides parameter hints for function calls.
 *
 * @param params The signature help parameters.
 * @param document The text document.
 * @returns A SignatureHelp object or null.
 */
export function onSignatureHelp(
    params: SignatureHelpParams,
    document: TextDocument
): SignatureHelp | null {
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
                    const symbols = parseDocumentSymbols(document);
                    const symbol = findSymbolInScope(
                        symbols,
                        functionName.toLowerCase(),
                        params.position
                    );

                    if (
                        symbol &&
                        symbol.detail &&
                        (symbol.detail.startsWith('Sub') || symbol.detail.startsWith('Function'))
                    ) {
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

                        // Determine active parameter
                        // Count commas between nameEnd and offset, respecting nested parens/strings?
                        // Simplified: just count commas in the current level.
                        let activeParameter = 0;
                        let innerLevel = 0;
                        for (let j = nameEnd + 1; j < offset; j++) {
                            const c = text[j];
                            if (c === '(') innerLevel++;
                            else if (c === ')') innerLevel--;
                            else if (c === ',' && innerLevel === 0) activeParameter++;
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

    return null;
}
