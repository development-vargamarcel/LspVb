import { CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver/node';

/**
 * A collection of code snippets for common Visual Basic structures.
 * Provided as completion items.
 */
export const SNIPPETS: CompletionItem[] = [
    {
        label: 'Sub ... End Sub',
        kind: CompletionItemKind.Snippet,
        insertText: 'Sub ${1:Name}(${2:args})\n\t$0\nEnd Sub',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Subroutine block'
    },
    {
        label: 'Function ... End Function',
        kind: CompletionItemKind.Snippet,
        insertText: 'Function ${1:Name}(${2:args}) As ${3:Type}\n\t$0\n\t$1 = result\nEnd Function',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Function block'
    },
    {
        label: 'If ... Then ... End If',
        kind: CompletionItemKind.Snippet,
        insertText: 'If ${1:condition} Then\n\t$0\nEnd If',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'If block'
    },
    {
        label: 'For ... Next',
        kind: CompletionItemKind.Snippet,
        insertText: 'For ${1:i} = ${2:0} To ${3:10}\n\t$0\nNext',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'For loop'
    },
    {
        label: 'Do ... Loop',
        kind: CompletionItemKind.Snippet,
        insertText: 'Do\n\t$0\nLoop',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Do loop'
    },
    {
        label: 'Select Case',
        kind: CompletionItemKind.Snippet,
        insertText: 'Select Case ${1:expression}\n\tCase ${2:value}\n\t\t$0\nEnd Select',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Select Case block'
    },
    {
        label: 'Class ... End Class',
        kind: CompletionItemKind.Snippet,
        insertText: 'Class ${1:Name}\n\t$0\nEnd Class',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Class definition'
    },
    {
        label: 'Module ... End Module',
        kind: CompletionItemKind.Snippet,
        insertText: 'Module ${1:Name}\n\t$0\nEnd Module',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Module definition'
    }
];
