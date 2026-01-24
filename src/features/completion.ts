import {
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    SymbolKind,
    DocumentSymbol
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { KEYWORDS } from '../keywords';
import { parseDocumentSymbols, getVisibleSymbols, findSymbolInScope } from '../utils/parser';
import { SNIPPETS } from '../snippets';
import { Logger } from '../utils/logger';

/**
 * Handles completion requests.
 * Provides suggestions for keywords, snippets, and symbols (variables, classes, etc.).
 * Supports dot-access (member completion) and type context (after 'As').
 *
 * @param params The completion parameters (position, document context).
 * @param document The text document.
 * @returns An array of completion items.
 */
export function onCompletion(
    params: TextDocumentPositionParams,
    document: TextDocument
): CompletionItem[] {
    const items: CompletionItem[] = [];
    const text = document.getText();
    const offset = document.offsetAt(params.position);

    const symbols = parseDocumentSymbols(document);

    // 1. Check for Member Access (Dot)
    // We scan backwards from the cursor to find the chain.
    let scanIndex = offset;

    // 1. Skip current word being typed (if any)
    while (scanIndex > 0 && /\w/.test(text[scanIndex - 1])) {
        scanIndex--;
    }

    // 2. Skip whitespace
    while (scanIndex > 0 && /[ \t]/.test(text[scanIndex - 1])) {
        scanIndex--;
    }

    // 3. Check for Dot
    const isMemberAccess = scanIndex > 0 && text[scanIndex - 1] === '.';

    if (isMemberAccess) {
        Logger.log('Completion: Member access detected.');
        scanIndex--; // Move past the dot
        const parts: string[] = [];

        while (scanIndex >= 0) {
            // a. Skip whitespace
            while (scanIndex > 0 && /[ \t]/.test(text[scanIndex - 1])) {
                scanIndex--;
            }

            // b. Read Word
            const wordEnd = scanIndex;
            while (scanIndex > 0 && /\w/.test(text[scanIndex - 1])) {
                scanIndex--;
            }
            if (scanIndex === wordEnd) {
                // No word found (e.g. ".." or ". " or start of line)
                break;
            }
            const word = text.substring(scanIndex, wordEnd);
            parts.unshift(word); // Add to front

            // c. Skip whitespace again (before the word)
            while (scanIndex > 0 && /[ \t]/.test(text[scanIndex - 1])) {
                scanIndex--;
            }

            // d. Check for Dot
            if (scanIndex > 0 && text[scanIndex - 1] === '.') {
                scanIndex--; // Consume dot and continue loop
            } else {
                // No dot, end of chain
                break;
            }
        }

        if (parts.length > 0) {
            let currentSymbol: DocumentSymbol | null = null;

            // Resolve the first part (variable or class)
            currentSymbol = findSymbolInScope(symbols, parts[0].toLowerCase(), params.position);

            // Resolve subsequent parts
            for (let i = 0; i < parts.length; i++) {
                // If this is the last part, we are looking for its type's members
                // But wait, the chain is "p.Home". "p" is part[0], "Home" is part[1].
                // We need to resolve "p" -> type Person.
                // Then resolve "Home" inside Person -> type Address.
                // Then return members of Address.

                // If currentSymbol is a variable/property, we need its type.
                if (!currentSymbol) break;

                // Get type of current symbol
                let typeName: string | null = null;

                if (currentSymbol.detail) {
                    const asMatch = /\bAs\s+(\w+)/i.exec(currentSymbol.detail);
                    if (asMatch) {
                        typeName = asMatch[1].toLowerCase();
                    }
                }

                if (!typeName) {
                    currentSymbol = null;
                    break;
                }

                // Find the Type definition (Class/Structure)
                const typeSymbol = findSymbolInScope(symbols, typeName, params.position);
                if (!typeSymbol) {
                    currentSymbol = null;
                    break;
                }

                // If we are at the last part of the chain (e.g. "p.Home" and we want members of Home),
                // we just found "Home"'s type ("Address"). So we are done.
                // UNLESS we are iterating.

                // Let's re-evaluate loop.
                // "p" -> currentSymbol = p (Variable). typeName = Person. typeSymbol = Class Person.
                // i=0. parts[0]="p".
                // If there are more parts (e.g. "Home"), we look for "Home" in "Class Person".

                if (i < parts.length - 1) {
                    const nextPart = parts[i + 1].toLowerCase();
                    // Look for nextPart in typeSymbol's children
                    if (typeSymbol.children) {
                        currentSymbol =
                            typeSymbol.children.find(
                                (c: DocumentSymbol) => c.name.toLowerCase() === nextPart
                            ) || null;
                    } else {
                        currentSymbol = null;
                    }
                } else {
                    // We processed the last part of the chain.
                    // The result is `typeSymbol` which is the type of the last property.
                    // We want to return its children.
                    if (typeSymbol.children) {
                        for (const child of typeSymbol.children) {
                            items.push({
                                label: child.name,
                                kind: mapSymbolKindToCompletionKind(child.kind),
                                detail: child.detail,
                                documentation: `Member of ${typeSymbol.name}`
                            });
                        }
                    }
                }
            }
            return items;
        }
    }

    // Check context (previous word)
    // Scan backwards from offset, skipping whitespace
    let i = offset - 1;
    // Skip current word being typed
    while (i >= 0 && /\w/.test(text[i])) {
        i--;
    }
    // Skip whitespace
    while (i >= 0 && /\s/.test(text[i])) {
        i--;
    }

    // Read previous word
    const end = i + 1;
    let start = end;
    while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
    }
    const prevWord = text.substring(start, end).toLowerCase();

    const isTypeContext = prevWord === 'as';

    if (isTypeContext) {
        Logger.log('Completion: Type context detected (As ...).');
    }

    // Add Keywords
    for (const key in KEYWORDS) {
        const val = KEYWORDS[key];

        // Context Filtering
        if (isTypeContext) {
            // In 'As ...' context, we only want Types (Classes, Interfaces, Enums)
            // KEYWORDS has 'kind'. Check if it is Class, Interface, etc.
            // Or specific keyword allowlist (Integer, String, etc.)

            // KEYWORDS definitions for types use CompletionItemKind.Class
            // Also allow 'New' maybe? No, 'As New' is valid.

            if (val.kind === CompletionItemKind.Class || key === 'new') {
                items.push({
                    label: val.label,
                    kind: val.kind,
                    data: key
                });
            }
        } else {
            // Not in Type context.
            // We usually want everything, BUT maybe not Types as top level keywords?
            // Actually in VB 'Dim x As Integer', 'Integer' is valid only after As.
            // But 'x = Integer.Parse' ? (If Integer was a class).
            // Basic types like Integer are usually not valid as standalone statements.

            // Let's keep it simple: If NOT type context, include everything.
            // But maybe prioritize?

            items.push({
                label: val.label,
                kind: val.kind,
                data: key
            });
        }
    }

    // Add Symbols from Document
    // Use getVisibleSymbols to show only relevant symbols from current scope
    const visibleSymbols = getVisibleSymbols(symbols, params.position);
    for (const sym of visibleSymbols) {
        // For symbols, we might also want to filter.
        // If 'As ...', we only want Classes/Enums/Modules?
        // Variables/Functions are not types.

        let shouldAdd = true;
        if (isTypeContext) {
            if (
                sym.kind !== SymbolKind.Class &&
                sym.kind !== SymbolKind.Module &&
                sym.kind !== SymbolKind.Interface &&
                sym.kind !== SymbolKind.Enum
            ) {
                shouldAdd = false;
            }
        }

        if (shouldAdd) {
            items.push({
                label: sym.name,
                kind: mapSymbolKindToCompletionKind(sym.kind),
                detail: sym.detail,
                documentation: `User defined symbol: ${sym.name}`
            });
        }
    }

    // Add Snippets
    // Snippets are usually statements (If, For, Sub).
    // They are NOT valid in Type context.
    if (!isTypeContext) {
        items.push(...SNIPPETS);
    }

    return items;
}

/**
 * Resolves additional information for a completion item (e.g., documentation).
 *
 * @param item The completion item to resolve.
 * @returns The resolved completion item.
 */
export function onCompletionResolve(item: CompletionItem): CompletionItem {
    const data = item.data as string;
    if (data && KEYWORDS[data]) {
        item.detail = KEYWORDS[data].detail;
        item.documentation = KEYWORDS[data].documentation;
    }
    return item;
}

function mapSymbolKindToCompletionKind(kind: SymbolKind): CompletionItemKind {
    switch (kind) {
        case SymbolKind.Method:
            return CompletionItemKind.Method;
        case SymbolKind.Function:
            return CompletionItemKind.Function;
        case SymbolKind.Class:
            return CompletionItemKind.Class;
        case SymbolKind.Module:
            return CompletionItemKind.Module;
        case SymbolKind.Variable:
            return CompletionItemKind.Variable;
        case SymbolKind.Constant:
            return CompletionItemKind.Constant;
        case SymbolKind.Field:
            return CompletionItemKind.Field;
        case SymbolKind.Property:
            return CompletionItemKind.Property;
        default:
            return CompletionItemKind.Text;
    }
}
