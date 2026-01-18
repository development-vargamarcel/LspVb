import { Diagnostic, DiagnosticSeverity, TextDocument } from 'vscode-languageserver/node';

export function validateTextDocument(textDocument: TextDocument): Diagnostic[] {
	const text = textDocument.getText();
	let m: RegExpExecArray | null;
    const diagnostics: Diagnostic[] = [];

    // Simple regex for "If ... " without "Then" on the same line (very naive)
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

    // Block Structure Validation
    const lines = text.split(/\r?\n/);
    const stack: { type: string, line: number }[] = [];

    const blockStart = /^\s*(?:(?:Public|Private|Friend|Protected)\s+)?(Sub|Function|Class|Module|Property)\b/i;
    const ifStart = /^\s*If\b/i;
    const forStart = /^\s*For\b/i;
    const selectStart = /^\s*Select\s+Case\b/i;
    const doStart = /^\s*Do\b/i;
    const whileStart = /^\s*While\b/i;

    const blockEnd = /^\s*End\s+(Sub|Function|Class|Module|Property|If|Select)\b/i;
    const nextEnd = /^\s*Next\b/i;
    const loopEnd = /^\s*Loop\b/i;
    const wendEnd = /^\s*Wend\b/i;

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const lineContent = rawLine.replace(/'.*$/, ''); // Strip comment
        const trimmed = lineContent.trim();
        if (!trimmed) continue;

        // Check End
        let endMatch: RegExpMatchArray | null;
        if ((endMatch = blockEnd.exec(trimmed))) {
            const type = endMatch[1]; // Sub, Function, If...
            checkStack(stack, type, i, rawLine, diagnostics);
            continue;
        }
        if (nextEnd.test(trimmed)) {
            checkStack(stack, 'For', i, rawLine, diagnostics);
            continue;
        }
        if (loopEnd.test(trimmed)) {
            checkStack(stack, 'Do', i, rawLine, diagnostics);
            continue;
        }
        if (wendEnd.test(trimmed)) {
            checkStack(stack, 'While', i, rawLine, diagnostics);
            continue;
        }

        // Check Start
        let startMatch: RegExpMatchArray | null;
        if ((startMatch = blockStart.exec(trimmed))) {
            // Ignore "End Sub" etc (already caught by blockEnd, but ensure regex doesn't overlap incorrectly)
            // blockStart matches "Sub", blockEnd matches "End Sub".
            // "End Sub" starts with End. blockStart regex expects (Modifier)? (Type).
            // "End Sub" does NOT match blockStart because "End" is not a modifier.
             stack.push({ type: startMatch[1], line: i });
             continue;
        }
        if (ifStart.test(trimmed)) {
            // Check if single line
            if (!/\bThen\b/i.test(trimmed)) {
                 stack.push({ type: 'If', line: i });
            } else {
                 const afterThen = trimmed.substring(trimmed.toLowerCase().indexOf('then') + 4).trim();
                 if (afterThen === '') {
                     stack.push({ type: 'If', line: i });
                 }
            }
            continue;
        }
        if (forStart.test(trimmed)) {
            stack.push({ type: 'For', line: i });
            continue;
        }
        if (selectStart.test(trimmed)) {
            stack.push({ type: 'Select', line: i });
            continue;
        }
        if (doStart.test(trimmed)) {
            stack.push({ type: 'Do', line: i });
            continue;
        }
        if (whileStart.test(trimmed)) {
            stack.push({ type: 'While', line: i });
            continue;
        }
    }

    // Check remaining stack
    for (const item of stack) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: item.line, character: 0 },
                end: { line: item.line, character: lines[item.line].length }
            },
            message: `Missing closing statement for '${item.type}' block.`,
            source: 'SimpleVB'
        });
    }

    return diagnostics;
}

function checkStack(stack: { type: string, line: number }[], expectedType: string, line: number, content: string, diagnostics: Diagnostic[]) {
    if (stack.length === 0) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line, character: 0 }, end: { line, character: content.length } },
            message: `Unexpected closing statement (no matching start).`,
            source: 'SimpleVB'
        });
        return;
    }
    const last = stack[stack.length - 1];

    // Normalize logic: "Select" vs "Select Case" -> "Select". "If" -> "If".
    // expectedType comes from regex match 1.

    let match = false;
    if (last.type.toLowerCase() === expectedType.toLowerCase()) match = true;

    if (match) {
        stack.pop();
    } else {
         diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line, character: 0 }, end: { line, character: content.length } },
            message: `Mismatched block: Expected closing for '${last.type}' (line ${last.line + 1}).`,
            source: 'SimpleVB'
        });
    }
}
