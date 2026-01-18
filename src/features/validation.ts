import { Diagnostic, DiagnosticSeverity, TextDocument } from 'vscode-languageserver/node';
import {
    VAL_BLOCK_START_REGEX,
    VAL_IF_START_REGEX,
    VAL_FOR_START_REGEX,
    VAL_SELECT_CASE_START_REGEX,
    VAL_DO_START_REGEX,
    VAL_WHILE_START_REGEX,
    VAL_BLOCK_END_REGEX,
    VAL_NEXT_REGEX,
    VAL_LOOP_REGEX,
    VAL_WEND_REGEX,
    VAL_DIM_REGEX,
    VAL_CONST_REGEX,
    VAL_IF_LINE_REGEX,
    VAL_THEN_REGEX
} from '../utils/regexes';

export function validateTextDocument(textDocument: TextDocument): Diagnostic[] {
	const text = textDocument.getText();
    const lines = text.split(/\r?\n/);
    const diagnostics: Diagnostic[] = [];
    const stack: { type: string, line: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const lineContent = rawLine.replace(/'.*$/, ''); // Strip comment
        const trimmed = lineContent.trim();
        if (!trimmed) continue;

        // 1. Line-level checks
        validateLine(trimmed, i, rawLine, textDocument, diagnostics);

        // 2. Block Structure
        processBlockStructure(trimmed, i, rawLine, stack, diagnostics);
    }

    // Check remaining stack (unclosed blocks)
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

function validateLine(trimmed: string, lineIndex: number, rawLine: string, document: TextDocument, diagnostics: Diagnostic[]) {
    // Check for "If ... " without "Then" (naive check)
    if (VAL_IF_LINE_REGEX.test(rawLine)) { // Use rawLine to preserve spaces for regex if needed, but trimmed is usually fine
         if (!VAL_THEN_REGEX.test(rawLine) && !trimmed.endsWith("_")) {
             diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: lineIndex, character: 0 },
                    end: { line: lineIndex, character: rawLine.length }
                },
                message: "Missing 'Then' in If statement.",
                source: 'SimpleVB'
            });
        }
    }

    // Check for "Dim x" without "As"
    if (VAL_DIM_REGEX.test(trimmed)) {
        diagnostics.push({
            severity: DiagnosticSeverity.Warning,
            range: {
                start: { line: lineIndex, character: 0 },
                end: { line: lineIndex, character: rawLine.length }
            },
            message: "Variable declaration without type (As ...).",
            source: 'SimpleVB'
        });
    }

    // Check for Const without initialization
    // Note: VAL_CONST_REGEX is stricter in regexes.ts now? Let's check regexes.ts again.
    // In regexes.ts: ^\s*(?:...)?Const\s+(\w+)(?:\s+As\s+(\w+))?\s*(?:'.*)?$
    // This matches lines that end WITHOUT = value.
    if (VAL_CONST_REGEX.test(rawLine)) {
         // We need to make sure it doesn't have an equals sign.
         // The regex matches the declaration part. If the line contains "=", it shouldn't trigger if we crafted regex correctly?
         // Actually, the regex `VAL_CONST_REGEX` in `regexes.ts` matches `Const x As y` and ends there (or with comment).
         // It does NOT match `Const x As y = 1`.
         // So if it matches, it means it's missing the value.
         diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: lineIndex, character: 0 },
                end: { line: lineIndex, character: rawLine.length }
            },
            message: "Const declaration requires a value (e.g. Const x = 1).",
            source: 'SimpleVB'
        });
    }
}

function processBlockStructure(trimmed: string, lineIndex: number, rawLine: string, stack: { type: string, line: number }[], diagnostics: Diagnostic[]) {
    // Check End first
    let endMatch: RegExpMatchArray | null;
    if ((endMatch = VAL_BLOCK_END_REGEX.exec(trimmed))) {
        const type = endMatch[1]; // Sub, Function, If...
        checkStack(stack, type, lineIndex, rawLine, diagnostics);
        return;
    }
    if (VAL_NEXT_REGEX.test(trimmed)) {
        checkStack(stack, 'For', lineIndex, rawLine, diagnostics);
        return;
    }
    if (VAL_LOOP_REGEX.test(trimmed)) {
        checkStack(stack, 'Do', lineIndex, rawLine, diagnostics);
        return;
    }
    if (VAL_WEND_REGEX.test(trimmed)) {
        checkStack(stack, 'While', lineIndex, rawLine, diagnostics);
        return;
    }

    // Check Start
    let startMatch: RegExpMatchArray | null;
    if ((startMatch = VAL_BLOCK_START_REGEX.exec(trimmed))) {
         stack.push({ type: startMatch[1], line: lineIndex });
         return;
    }
    if (VAL_IF_START_REGEX.test(trimmed)) {
        // Check if single line
        if (!VAL_THEN_REGEX.test(trimmed)) {
             stack.push({ type: 'If', line: lineIndex });
        } else {
             const lower = trimmed.toLowerCase();
             const thenIndex = lower.indexOf('then');
             const afterThen = trimmed.substring(thenIndex + 4).trim();
             // If nothing after Then, it's a block If
             if (afterThen === '') {
                 stack.push({ type: 'If', line: lineIndex });
             }
        }
        return;
    }
    if (VAL_FOR_START_REGEX.test(trimmed)) {
        stack.push({ type: 'For', line: lineIndex });
        return;
    }
    if (VAL_SELECT_CASE_START_REGEX.test(trimmed)) {
        stack.push({ type: 'Select', line: lineIndex });
        return;
    }
    if (VAL_DO_START_REGEX.test(trimmed)) {
        stack.push({ type: 'Do', line: lineIndex });
        return;
    }
    if (VAL_WHILE_START_REGEX.test(trimmed)) {
        stack.push({ type: 'While', line: lineIndex });
        return;
    }
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

    // Normalize "Select Case" -> "Select"
    let normLast = last.type;
    // (regex captures "Sub", "If", "Select") so usually it's already normalized, but let's be safe

    // Case insensitive comparison
    if (normLast.toLowerCase() === expectedType.toLowerCase()) {
        stack.pop();
    } else {
         // Special case: "Next" can sometimes close "For" or "For Each" (both stored as "For"?)
         // We simplified regex to just "For", so "For Each" would match VAL_FOR_START_REGEX?
         // Wait, VAL_FOR_START_REGEX = /^\s*For\b/i; matches "For Each" too because "For" is a word boundary.

         diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line, character: 0 }, end: { line, character: content.length } },
            message: `Mismatched block: Expected closing for '${last.type}' (line ${last.line + 1}), but found 'End ${expectedType}'.`,
            source: 'SimpleVB'
        });
        // We do NOT pop here because the outer block is still open.
        // This is a heuristic.
    }
}
