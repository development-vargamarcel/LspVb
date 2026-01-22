import {
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    SymbolKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { KEYWORDS } from '../keywords';
import { parseDocumentSymbols } from '../utils/parser';
import { SNIPPETS } from '../snippets';

export function onCompletion(
    params: TextDocumentPositionParams,
    document: TextDocument
): CompletionItem[] {
    const items: CompletionItem[] = [];
    const text = document.getText();
    const offset = document.offsetAt(params.position);

    const symbols = parseDocumentSymbols(document);

    // 1. Check for Member Access (Dot)
    let triggerOffset = offset - 1;
    while (triggerOffset >= 0 && /\w/.test(text[triggerOffset])) {
        triggerOffset--;
    }

    // Check if the character before the current word (or cursor) is a dot
    const isMemberAccess = triggerOffset >= 0 && text[triggerOffset] === '.';

    if (isMemberAccess) {
        // Get the variable name before the dot
        let dotIndex = triggerOffset;
        let varEnd = dotIndex; // Start scanning before dot
        let varStart = varEnd - 1;

        // Skip whitespace before dot
        while (varStart >= 0 && /\s/.test(text[varStart])) {
            varStart--;
        }
        varEnd = varStart + 1;

        // Scan the word
        while (varStart >= 0 && /\w/.test(text[varStart])) {
            varStart--;
        }
        const varName = text.substring(varStart + 1, varEnd).toLowerCase();

        // Find the variable symbol
        const varSymbol = findSymbolRecursive(symbols, varName);

        if (varSymbol && varSymbol.detail) {
            // Parse detail to get type: "Dim x As MyClass" -> "MyClass"
            const asMatch = /\bAs\s+(\w+)/i.exec(varSymbol.detail);
            if (asMatch) {
                const typeName = asMatch[1].toLowerCase();
                // Find the type definition
                const typeSymbol = findSymbolRecursive(symbols, typeName);
                if (typeSymbol && typeSymbol.children) {
                     for (const child of typeSymbol.children) {
                         items.push({
                             label: child.name,
                             kind: mapSymbolKindToCompletionKind(child.kind),
                             detail: child.detail,
                             documentation: `Member of ${typeSymbol.name}`
                         });
                     }
                     return items;
                }
            }
        }
        // If we can't find the type or members, we might return empty or standard items.
        // For now, let's return empty to avoid noise if we are confident it's a member access.
        // Or maybe falling back to global symbols is better?
        // Let's return empty to be strict about "Member Access".
        return items;
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
    let end = i + 1;
    let start = end;
    while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
    }
    const prevWord = text.substring(start, end).toLowerCase();

    const isTypeContext = prevWord === 'as';

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
    // const symbols = parseDocumentSymbols(document); // Already parsed above
    for (const sym of symbols) {
        // For symbols, we might also want to filter.
        // If 'As ...', we only want Classes/Enums/Modules?
        // Variables/Functions are not types.

        let shouldAdd = true;
        if (isTypeContext) {
            if (sym.kind !== SymbolKind.Class && sym.kind !== SymbolKind.Module && sym.kind !== SymbolKind.Interface && sym.kind !== SymbolKind.Enum) {
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

export function onCompletionResolve(item: CompletionItem): CompletionItem {
    const data = item.data as string;
    if (data && KEYWORDS[data]) {
        item.detail = KEYWORDS[data].detail;
        item.documentation = KEYWORDS[data].documentation;
    }
    return item;
}

function findSymbolRecursive(symbols: any[], name: string): any | null {
    for (const sym of symbols) {
        if (sym.name.toLowerCase() === name) {
            return sym;
        }
        if (sym.children) {
            const childMatch = findSymbolRecursive(sym.children, name);
            if (childMatch) return childMatch;
        }
    }
    return null;
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
