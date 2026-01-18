import { CompletionItem, CompletionItemKind, TextDocumentPositionParams, SymbolKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { KEYWORDS } from '../keywords';
import { parseDocumentSymbols } from '../utils/parser';

export function onCompletion(params: TextDocumentPositionParams, document: TextDocument): CompletionItem[] {
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
        // Convert SymbolKind to CompletionItemKind
        let kind: CompletionItemKind = CompletionItemKind.Text;
        switch (sym.kind) {
            case SymbolKind.Method: kind = CompletionItemKind.Method; break;
            case SymbolKind.Function: kind = CompletionItemKind.Function; break;
            case SymbolKind.Class: kind = CompletionItemKind.Class; break;
            case SymbolKind.Module: kind = CompletionItemKind.Module; break;
            case SymbolKind.Variable: kind = CompletionItemKind.Variable; break;
            case SymbolKind.Constant: kind = CompletionItemKind.Constant; break;
            case SymbolKind.Field: kind = CompletionItemKind.Field; break;
        }

        items.push({
            label: sym.name,
            kind: kind,
            detail: sym.detail,
            documentation: `User defined symbol: ${sym.name}`
        });
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
