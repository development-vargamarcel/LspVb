import { CompletionItem, CompletionItemKind, TextDocumentPositionParams, SymbolKind, InsertTextFormat } from 'vscode-languageserver/node';
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

    // Add Snippets
    items.push({
        label: 'Sub ... End Sub',
        kind: CompletionItemKind.Snippet,
        insertText: 'Sub ${1:Name}(${2:args})\n\t$0\nEnd Sub',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Subroutine block'
    });

    items.push({
        label: 'Function ... End Function',
        kind: CompletionItemKind.Snippet,
        insertText: 'Function ${1:Name}(${2:args}) As ${3:Type}\n\t$0\n\t$1 = result\nEnd Function',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Function block'
    });

    items.push({
        label: 'If ... Then ... End If',
        kind: CompletionItemKind.Snippet,
        insertText: 'If ${1:condition} Then\n\t$0\nEnd If',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'If block'
    });

    items.push({
        label: 'For ... Next',
        kind: CompletionItemKind.Snippet,
        insertText: 'For ${1:i} = ${2:0} To ${3:10}\n\t$0\nNext',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'For loop'
    });

    items.push({
        label: 'Do ... Loop',
        kind: CompletionItemKind.Snippet,
        insertText: 'Do\n\t$0\nLoop',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Do loop'
    });

    items.push({
        label: 'Select Case',
        kind: CompletionItemKind.Snippet,
        insertText: 'Select Case ${1:expression}\n\tCase ${2:value}\n\t\t$0\nEnd Select',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Select Case block'
    });

    items.push({
        label: 'Class ... End Class',
        kind: CompletionItemKind.Snippet,
        insertText: 'Class ${1:Name}\n\t$0\nEnd Class',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Class definition'
    });

    items.push({
        label: 'Module ... End Module',
        kind: CompletionItemKind.Snippet,
        insertText: 'Module ${1:Name}\n\t$0\nEnd Module',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Module definition'
    });

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
