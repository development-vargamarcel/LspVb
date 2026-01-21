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

    // Add Keywords
    for (const key in KEYWORDS) {
        const val = KEYWORDS[key];
        items.push({
            label: val.label,
            kind: val.kind,
            data: key
        });
    }

    // Add Symbols from Document
    const symbols = parseDocumentSymbols(document);
    for (const sym of symbols) {
        items.push({
            label: sym.name,
            kind: mapSymbolKindToCompletionKind(sym.kind),
            detail: sym.detail,
            documentation: `User defined symbol: ${sym.name}`
        });
    }

    // Add Snippets
    items.push(...SNIPPETS);

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
