import { CompletionItem, CompletionItemKind, TextDocumentPositionParams } from 'vscode-languageserver/node';
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
        switch (sym.kind as any) {
            case 6: kind = CompletionItemKind.Method; break; // Method
            case 12: kind = CompletionItemKind.Function; break; // Function
            case 5: kind = CompletionItemKind.Class; break; // Class
            case 2: kind = CompletionItemKind.Module; break; // Module
            case 13: kind = CompletionItemKind.Variable; break; // Variable
            case 14: kind = CompletionItemKind.Constant; break; // Constant
            case 8: kind = CompletionItemKind.Field; break; // Field
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
