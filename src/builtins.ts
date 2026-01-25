import { CompletionItemKind, ParameterInformation } from 'vscode-languageserver/node';

export interface BuiltinSymbol {
    label: string;
    documentation: string;
    detail: string;
    kind: CompletionItemKind;
    parameters?: ParameterInformation[];
}

export const BUILTINS: Record<string, BuiltinSymbol> = {
    'len': {
        label: 'Len',
        detail: 'Len(Expression) As Integer',
        documentation: 'Returns an integer containing the number of characters in a string or the number of bytes required to store a variable.',
        kind: CompletionItemKind.Function,
        parameters: [
            { label: 'Expression', documentation: 'Any valid String expression or variable name.' }
        ]
    },
    'mid': {
        label: 'Mid',
        detail: 'Mid(str, start, [length]) As String',
        documentation: 'Returns a string containing a specified number of characters from a string.',
        kind: CompletionItemKind.Function,
        parameters: [
            { label: 'str', documentation: 'String expression from which characters are returned.' },
            { label: 'start', documentation: 'Starting position of the characters to return.' },
            { label: 'length', documentation: 'Optional. Number of characters to return.' }
        ]
    },
    'left': {
        label: 'Left',
        detail: 'Left(str, length) As String',
        documentation: 'Returns a string containing a specified number of characters from the left side of a string.',
        kind: CompletionItemKind.Function,
        parameters: [
            { label: 'str', documentation: 'String expression.' },
            { label: 'length', documentation: 'Number of characters to return.' }
        ]
    },
    'right': {
        label: 'Right',
        detail: 'Right(str, length) As String',
        documentation: 'Returns a string containing a specified number of characters from the right side of a string.',
        kind: CompletionItemKind.Function,
        parameters: [
            { label: 'str', documentation: 'String expression.' },
            { label: 'length', documentation: 'Number of characters to return.' }
        ]
    },
    'msgbox': {
        label: 'MsgBox',
        detail: 'MsgBox(Prompt, [Buttons], [Title]) As Integer',
        documentation: 'Displays a message in a dialog box, waits for the user to click a button, and returns an Integer indicating which button the user clicked.',
        kind: CompletionItemKind.Function,
        parameters: [
            { label: 'Prompt', documentation: 'String expression displayed as the message.' },
            { label: 'Buttons', documentation: 'Optional. Numeric expression that is the sum of values specifying the number and type of buttons to display.' },
            { label: 'Title', documentation: 'Optional. String expression displayed in the title bar of the dialog box.' }
        ]
    },
    'inputbox': {
        label: 'InputBox',
        detail: 'InputBox(Prompt, [Title], [Default]) As String',
        documentation: 'Displays a prompt in a dialog box, waits for the user to input text or click a button, and returns a String containing the contents of the text box.',
        kind: CompletionItemKind.Function,
        parameters: [
            { label: 'Prompt', documentation: 'String expression displayed as the message.' },
            { label: 'Title', documentation: 'Optional. String expression displayed in the title bar.' },
            { label: 'Default', documentation: 'Optional. String expression displayed in the text box as the default response.' }
        ]
    },
    'ucase': {
        label: 'UCase',
        detail: 'UCase(str) As String',
        documentation: 'Returns a String or Char containing the specified string converted to uppercase.',
        kind: CompletionItemKind.Function,
        parameters: [{ label: 'str', documentation: 'String expression.' }]
    },
    'lcase': {
        label: 'LCase',
        detail: 'LCase(str) As String',
        documentation: 'Returns a String or Char containing the specified string converted to lowercase.',
        kind: CompletionItemKind.Function,
        parameters: [{ label: 'str', documentation: 'String expression.' }]
    },
    'trim': {
        label: 'Trim',
        detail: 'Trim(str) As String',
        documentation: 'Returns a string containing a copy of a specified string with no leading or trailing spaces.',
        kind: CompletionItemKind.Function,
        parameters: [{ label: 'str', documentation: 'String expression.' }]
    },
    'cint': {
        label: 'CInt',
        detail: 'CInt(expression) As Integer',
        documentation: 'Converts an expression to an Integer.',
        kind: CompletionItemKind.Function,
        parameters: [{ label: 'expression', documentation: 'Any valid expression.' }]
    },
    'cstr': {
        label: 'CStr',
        detail: 'CStr(expression) As String',
        documentation: 'Converts an expression to a String.',
        kind: CompletionItemKind.Function,
        parameters: [{ label: 'expression', documentation: 'Any valid expression.' }]
    },
    'cdbl': {
        label: 'CDbl',
        detail: 'CDbl(expression) As Double',
        documentation: 'Converts an expression to a Double.',
        kind: CompletionItemKind.Function,
        parameters: [{ label: 'expression', documentation: 'Any valid expression.' }]
    },
    'now': {
        label: 'Now',
        detail: 'Now As Date',
        documentation: 'Returns a Date value containing the current date and time.',
        kind: CompletionItemKind.Property, // Or Function
        parameters: []
    }
};
