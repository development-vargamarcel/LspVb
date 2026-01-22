import {
    CodeAction,
    CodeActionKind,
    CodeActionParams,
    Command,
    TextDocumentEdit,
    TextEdit,
    Range,
    WorkspaceEdit
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

export function onCodeAction(params: CodeActionParams, document: TextDocument): (Command | CodeAction)[] {
    const diagnostics = params.context.diagnostics;
    const actions: CodeAction[] = [];

    for (const diagnostic of diagnostics) {
        if (diagnostic.message.includes("Missing 'Then' in If statement")) {
            const range = diagnostic.range;
            const lineText = document.getText(range);
            const commentIndex = lineText.indexOf("'");
            let insertPos = range.end;

            if (commentIndex !== -1) {
                insertPos = { line: range.start.line, character: commentIndex };
            }

            // Check if there is space before
            // lineText is "If x = 1 ' comment"
            // commentIndex is 9
            // lineText[8] is '1' (not space)

            // NOTE: range.end might be beyond line length if regex matched incorrectly or includes \n?
            // Diagnostics range comes from validator which does: Range.create(line, 0, line, lineLength)
            // So lineText is the full line content.

            const prevChar = commentIndex !== -1 ? lineText[commentIndex - 1] : lineText[lineText.length - 1];
            const needsSpace = prevChar !== ' ';

            // If there is a comment, we want " Then ".
            // If it is end of line, we want " Then".

            let insertText = "Then";
            if (needsSpace) {
                insertText = " " + insertText;
            }
            if (commentIndex !== -1) {
                insertText = insertText + " ";
            }

            const edit: WorkspaceEdit = {
                changes: {
                    [document.uri]: [
                        TextEdit.insert(insertPos, insertText)
                    ]
                }
            };

            actions.push({
                title: "Add 'Then'",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: edit
            });
        }
        else if (diagnostic.message.includes("Variable declaration without type")) {
             // Range is the line. regex was `Dim x`.
             // We want to append " As Object" (default safe type)
             const range = diagnostic.range;
             const lineText = document.getText(range);
             const commentIndex = lineText.indexOf("'");
             let insertPos = range.end;

             if (commentIndex !== -1) {
                 insertPos = { line: range.start.line, character: commentIndex };
             }

             // Append " As Object"
             // Check whitespace
             let prefix = " ";
             if (commentIndex !== -1) {
                  if (lineText[commentIndex - 1] === ' ') prefix = "";
             } else {
                  if (lineText.endsWith(' ')) prefix = "";
             }

             const textToInsert = prefix + "As Object";

             // If inserting before comment, maybe add space after?
             // "Dim x 'comment" -> "Dim x As Object 'comment"
             const suffix = (commentIndex !== -1 && lineText[commentIndex - 1] !== ' ') ? " " : "";

             const edit: WorkspaceEdit = {
                 changes: {
                     [document.uri]: [
                         TextEdit.insert(insertPos, textToInsert + suffix)
                     ]
                 }
             };

             actions.push({
                 title: "Add 'As Object'",
                 kind: CodeActionKind.QuickFix,
                 diagnostics: [diagnostic],
                 edit: edit
             });
        }
        else if (diagnostic.message.includes("Const declaration requires a value")) {
            // Range is line. regex `Const x`.
            // Append " = 0"
             const range = diagnostic.range;
             const lineText = document.getText(range);
             const commentIndex = lineText.indexOf("'");
             let insertPos = range.end;

             if (commentIndex !== -1) {
                 insertPos = { line: range.start.line, character: commentIndex };
             }

             const textToInsert = " = 0";

             const edit: WorkspaceEdit = {
                 changes: {
                     [document.uri]: [
                         TextEdit.insert(insertPos, textToInsert)
                     ]
                 }
             };

             actions.push({
                 title: "Initialize with 0",
                 kind: CodeActionKind.QuickFix,
                 diagnostics: [diagnostic],
                 edit: edit
             });
        }
    }

    return actions;
}
