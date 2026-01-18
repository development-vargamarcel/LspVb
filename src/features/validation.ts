import { Diagnostic, DiagnosticSeverity, TextDocument } from 'vscode-languageserver/node';

export function validateTextDocument(textDocument: TextDocument): Diagnostic[] {
	const text = textDocument.getText();
	let m: RegExpExecArray | null;
    const diagnostics: Diagnostic[] = [];

    // Simple regex for "If ... " without "Then" on the same line (very naive)
    // Matches "If " followed by anything that is NOT "Then" and then end of line.
    const ifRegex = /^\s*If\s+.*$/gm;
    while ((m = ifRegex.exec(text))) {
        const line = m[0];
        // Allow line continuation with "_" or "Then" present
        if (!/\bThen\b/i.test(line) && !line.trim().endsWith("_")) {
             const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: {
                    start: textDocument.positionAt(m.index),
                    end: textDocument.positionAt(m.index + m[0].length)
                },
                message: "Missing 'Then' in If statement.",
                source: 'SimpleVB'
            };
            diagnostics.push(diagnostic);
        }
    }

    // Check for "Dim x" -> "Dim x As ..." warning
    const dimRegex = /^\s*Dim\s+\w+\s*$/gm;
    while ((m = dimRegex.exec(text))) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Warning,
            range: {
                start: textDocument.positionAt(m.index),
                end: textDocument.positionAt(m.index + m[0].length)
            },
            message: "Variable declaration without type (As ...).",
            source: 'SimpleVB'
        };
        diagnostics.push(diagnostic);
    }

    // Check for Const declaration without initialization
    const constRegex = /^\s*(?:(Public|Private|Friend|Protected)\s+)?Const\s+(\w+)(?:\s+As\s+(\w+))?\s*(?:'.*)?$/gmi;
    while ((m = constRegex.exec(text))) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: {
                start: textDocument.positionAt(m.index),
                end: textDocument.positionAt(m.index + m[0].length)
            },
            message: "Const declaration requires a value (e.g. Const x = 1).",
            source: 'SimpleVB'
        };
        diagnostics.push(diagnostic);
    }

    // Check for End If/Sub/Function consistency (simple check)
    // TODO: More complex block matching could go here

    return diagnostics;
}
