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

interface BlockContext {
    type: string;
    line: number;
}

export function validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const text = textDocument.getText();
    const lines = text.split(/\r?\n/);
    const diagnostics: Diagnostic[] = [];
    const stack: BlockContext[] = [];

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        // Strip comment
        const commentIndex = rawLine.indexOf("'");
        const lineContent = commentIndex >= 0 ? rawLine.substring(0, commentIndex) : rawLine;
        const trimmed = lineContent.trim();

        if (!trimmed) continue;

        // 1. Line-level checks (Syntax)
        validateLineSyntax(trimmed, i, rawLine, diagnostics);

        // 2. Block Structure
        updateBlockStack(trimmed, i, stack, diagnostics, rawLine);
    }

    // Check for unclosed blocks at the end of the document
    for (const item of stack) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: item.line, character: 0 },
                end: { line: item.line, character: lines[item.line].length }
            },
            message: `Missing closing statement for '${item.type}' block started at line ${item.line + 1}.`,
            source: 'SimpleVB'
        });
    }

    return diagnostics;
}

/**
 * Validates individual line syntax errors.
 */
function validateLineSyntax(trimmed: string, lineIndex: number, rawLine: string, diagnostics: Diagnostic[]) {
    // Check for "If ... " without "Then"
    if (VAL_IF_LINE_REGEX.test(rawLine)) {
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

    // Check for Const without value
    // The regex matches `Const name [As Type]`. If it matched and there is no `=`, it's an error.
    if (VAL_CONST_REGEX.test(rawLine)) {
         if (!rawLine.includes("=")) {
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
}

/**
 * Updates the block stack based on the current line.
 */
function updateBlockStack(trimmed: string, lineIndex: number, stack: BlockContext[], diagnostics: Diagnostic[], rawLine: string) {
    // 1. Check for End/Closing statements first
    if (handleBlockEnd(trimmed, lineIndex, stack, diagnostics, rawLine)) {
        return;
    }

    // 2. Check for Start/Opening statements
    handleBlockStart(trimmed, lineIndex, stack);
}

function handleBlockEnd(trimmed: string, lineIndex: number, stack: BlockContext[], diagnostics: Diagnostic[], rawLine: string): boolean {
    let endMatch: RegExpMatchArray | null;

    // Check "End ..." (Sub, Function, If, Select, etc.)
    if ((endMatch = VAL_BLOCK_END_REGEX.exec(trimmed))) {
        const type = endMatch[1];
        checkStack(stack, type, lineIndex, rawLine, diagnostics);
        return true;
    }

    // Check "Next"
    if (VAL_NEXT_REGEX.test(trimmed)) {
        checkStack(stack, 'For', lineIndex, rawLine, diagnostics);
        return true;
    }

    // Check "Loop"
    if (VAL_LOOP_REGEX.test(trimmed)) {
        checkStack(stack, 'Do', lineIndex, rawLine, diagnostics);
        return true;
    }

    // Check "Wend"
    if (VAL_WEND_REGEX.test(trimmed)) {
        checkStack(stack, 'While', lineIndex, rawLine, diagnostics);
        return true;
    }

    return false;
}

function handleBlockStart(trimmed: string, lineIndex: number, stack: BlockContext[]) {
    // Check "Sub", "Function", "Class", "Module", "Property"
    let startMatch: RegExpMatchArray | null;
    if ((startMatch = VAL_BLOCK_START_REGEX.exec(trimmed))) {
         // Avoid matching "End Sub" as a start if regex is not anchored correctly,
         // but VAL_BLOCK_START_REGEX expects start of string (ignoring modifiers).
         // Also we already checked End, so we are safe.
         stack.push({ type: startMatch[1], line: lineIndex });
         return;
    }

    // Check "If"
    if (VAL_IF_START_REGEX.test(trimmed)) {
        // If it's a block If, push to stack.
        // Single line If (If ... Then ...) should not be pushed.
        if (isBlockIf(trimmed)) {
             stack.push({ type: 'If', line: lineIndex });
        }
        return;
    }

    // Check "For"
    if (VAL_FOR_START_REGEX.test(trimmed)) {
        stack.push({ type: 'For', line: lineIndex });
        return;
    }

    // Check "Select Case"
    if (VAL_SELECT_CASE_START_REGEX.test(trimmed)) {
        stack.push({ type: 'Select', line: lineIndex });
        return;
    }

    // Check "Do"
    if (VAL_DO_START_REGEX.test(trimmed)) {
        stack.push({ type: 'Do', line: lineIndex });
        return;
    }

    // Check "While"
    if (VAL_WHILE_START_REGEX.test(trimmed)) {
        stack.push({ type: 'While', line: lineIndex });
        return;
    }
}

function isBlockIf(trimmed: string): boolean {
    if (!VAL_THEN_REGEX.test(trimmed)) {
        // "If condition" (missing Then) -> Treat as block start candidate (if user is typing)
        // or let line validation catch it. But for stacking, usually implies block if incomplete.
        // However, if we push it, and user never adds End If, we get error.
        // If we don't push it, and user adds End If, we get error.
        // Let's assume incomplete If is a block start.
        return true;
    }

    // Check what's after "Then"
    const lower = trimmed.toLowerCase();
    const thenIndex = lower.indexOf('then');
    const afterThen = trimmed.substring(thenIndex + 4).trim();

    // If empty after Then, it's a block If: "If x Then"
    // If not empty, check for comment: "If x Then 'comment" -> still block
    if (afterThen === '' || afterThen.startsWith("'")) {
        return true;
    }

    return false;
}

function checkStack(stack: BlockContext[], expectedType: string, line: number, content: string, diagnostics: Diagnostic[]) {
    if (stack.length === 0) {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line, character: 0 }, end: { line, character: content.length } },
            message: `Unexpected closing statement '${content.trim()}'.`,
            source: 'SimpleVB'
        });
        return;
    }

    const last = stack[stack.length - 1];

    // Normalize types for comparison
    const normLast = normalizeType(last.type);
    const normExpected = normalizeType(expectedType);

    if (normLast === normExpected) {
        stack.pop();
    } else {
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: { start: { line, character: 0 }, end: { line, character: content.length } },
            message: `Mismatched block: Expected closing for '${last.type}' (started line ${last.line + 1}), but found closing for '${expectedType}'.`,
            source: 'SimpleVB'
        });
        // Do not pop. Assume the inner block is missing its end, and this end belongs to an outer block?
        // Or assume this end is just wrong?
        // If we don't pop, we might cascade errors.
        // If we do pop, we might fix cascade but miss the fact the outer one is closed by the wrong thing?

        // Strategy: If mismatches, report error but do NOT pop, because likely the user forgot to close the inner block.
        // Example:
        // If ...
        //    For ...
        // End If  <-- Error: Expected Next.
        // If we pop 'For', then End If might match 'If'.

        // Let's peek deeper? No, keep it simple.
    }
}

function normalizeType(type: string): string {
    return type.toLowerCase();
}
