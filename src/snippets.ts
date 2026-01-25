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
    },
    {
        label: 'Do While ... Loop',
        kind: CompletionItemKind.Snippet,
        insertText: 'Do While ${1:condition}\n\t$0\nLoop',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Do While loop'
    },
    {
        label: 'While ... Wend',
        kind: CompletionItemKind.Snippet,
        insertText: 'While ${1:condition}\n\t$0\nWend',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'While loop'
    },
    {
        label: 'Property ... End Property',
        kind: CompletionItemKind.Snippet,
        insertText: 'Property ${1:Name} As ${2:Type}\n\tGet\n\t\tReturn ${3:value}\n\tEnd Get\n\tSet(value As ${2:Type})\n\t\t$0\n\tEnd Set\nEnd Property',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Property definition'
    },
    {
        label: 'Try ... Catch ... End Try',
        kind: CompletionItemKind.Snippet,
        insertText: 'Try\n\t$0\nCatch ex As Exception\n\t\nEnd Try',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Try Catch block'
    },
    {
        label: 'Property (Full)',
        kind: CompletionItemKind.Snippet,
        insertText: 'Private _${1:name} As ${2:Type}\nPublic Property ${3:Name} As ${2:Type}\n\tGet\n\t\tReturn _${1:name}\n\tEnd Get\n\tSet(value As ${2:Type})\n\t\t_${1:name} = value\n\tEnd Set\nEnd Property',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Property with backing field'
    },
    {
        label: 'Select Case (Default)',
        kind: CompletionItemKind.Snippet,
        insertText: 'Select Case ${1:expression}\n\tCase ${2:value}\n\t\t$0\n\tCase Else\n\t\t\nEnd Select',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Select Case with Case Else'
    },
    {
        label: 'Console.WriteLine',
        kind: CompletionItemKind.Snippet,
        insertText: 'Console.WriteLine(${1:value})',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Write line to console'
    }
];
