import { Diagnostic, DiagnosticSeverity, TextDocument, Range } from 'vscode-languageserver/node';
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
import { stripComment } from '../utils/textUtils';

interface BlockContext {
    type: string;
    line: number;
}

/**
 * Validates a text document for syntax and structure errors.
 */
export function validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    const validator = new Validator(textDocument);
    return validator.validate();
}

class Validator {
    private diagnostics: Diagnostic[] = [];
    private stack: BlockContext[] = [];
    private lines: string[];

    constructor(private document: TextDocument) {
        this.lines = document.getText().split(/\r?\n/);
    }

    public validate(): Diagnostic[] {
        for (let i = 0; i < this.lines.length; i++) {
            const rawLine = this.lines[i];
            const trimmed = stripComment(rawLine).trim();

            if (!trimmed) continue;

            this.validateSyntax(trimmed, i, rawLine);
            this.validateStructure(trimmed, i, rawLine);
        }

        this.checkUnclosedBlocks();
        return this.diagnostics;
    }

    private validateSyntax(trimmed: string, lineIndex: number, rawLine: string) {
        // Check for "If ... " without "Then"
        if (VAL_IF_LINE_REGEX.test(rawLine)) {
            if (!VAL_THEN_REGEX.test(rawLine) && !trimmed.endsWith("_")) {
                this.addDiagnostic(
                    lineIndex,
                    "Missing 'Then' in If statement.",
                    DiagnosticSeverity.Error
                );
            }
        }

        // Check for "Dim x" without "As"
        if (VAL_DIM_REGEX.test(trimmed)) {
            this.addDiagnostic(
                lineIndex,
                "Variable declaration without type (As ...).",
                DiagnosticSeverity.Warning
            );
        }

        // Check for Const without value
        if (VAL_CONST_REGEX.test(rawLine) && !rawLine.includes("=")) {
            this.addDiagnostic(
                lineIndex,
                "Const declaration requires a value (e.g. Const x = 1).",
                DiagnosticSeverity.Error
            );
        }
    }

    private validateStructure(trimmed: string, lineIndex: number, rawLine: string) {
        // 1. Check for End/Closing statements first
        if (this.handleBlockEnd(trimmed, lineIndex, rawLine)) {
            return;
        }

        // 2. Check for Start/Opening statements
        this.handleBlockStart(trimmed, lineIndex);
    }

    private handleBlockEnd(trimmed: string, lineIndex: number, rawLine: string): boolean {
        let match: RegExpMatchArray | null;

        // Check generic "End ..."
        if ((match = VAL_BLOCK_END_REGEX.exec(trimmed))) {
            this.checkStack(match[1], lineIndex, rawLine);
            return true;
        }

        // Check specific endings
        if (VAL_NEXT_REGEX.test(trimmed)) {
            this.checkStack('For', lineIndex, rawLine);
            return true;
        }
        if (VAL_LOOP_REGEX.test(trimmed)) {
            this.checkStack('Do', lineIndex, rawLine);
            return true;
        }
        if (VAL_WEND_REGEX.test(trimmed)) {
            this.checkStack('While', lineIndex, rawLine);
            return true;
        }

        return false;
    }

    private handleBlockStart(trimmed: string, lineIndex: number) {
        let match: RegExpMatchArray | null;

        // Generic Start
        if ((match = VAL_BLOCK_START_REGEX.exec(trimmed))) {
            this.pushStack(match[1], lineIndex);
            return;
        }

        // Specific Starts
        if (VAL_IF_START_REGEX.test(trimmed)) {
            if (this.isBlockIf(trimmed)) {
                this.pushStack('If', lineIndex);
            }
            return;
        }
        if (VAL_FOR_START_REGEX.test(trimmed)) {
            this.pushStack('For', lineIndex);
            return;
        }
        if (VAL_SELECT_CASE_START_REGEX.test(trimmed)) {
            this.pushStack('Select', lineIndex);
            return;
        }
        if (VAL_DO_START_REGEX.test(trimmed)) {
            this.pushStack('Do', lineIndex);
            return;
        }
        if (VAL_WHILE_START_REGEX.test(trimmed)) {
            this.pushStack('While', lineIndex);
            return;
        }
    }

    private isBlockIf(trimmed: string): boolean {
        if (!VAL_THEN_REGEX.test(trimmed)) {
            // Missing 'Then' -> Likely incomplete block If
            return true;
        }

        // Check content after "Then"
        // "If ... Then [Nothing or Comment]" -> Block
        // "If ... Then statement" -> Single line
        const lower = trimmed.toLowerCase();
        const thenIndex = lower.indexOf('then');
        const afterThen = trimmed.substring(thenIndex + 4).trim();

        return afterThen === '' || afterThen.startsWith("'");
    }

    private pushStack(type: string, line: number) {
        this.stack.push({ type, line });
    }

    private checkStack(expectedType: string, line: number, content: string) {
        if (this.stack.length === 0) {
            this.addDiagnostic(
                line,
                `Unexpected closing statement '${content.trim()}'.`,
                DiagnosticSeverity.Error
            );
            return;
        }

        const last = this.stack[this.stack.length - 1];
        if (last.type.toLowerCase() === expectedType.toLowerCase()) {
            this.stack.pop();
        } else {
            this.addDiagnostic(
                line,
                `Mismatched block: Expected closing for '${last.type}' (started line ${last.line + 1}), but found closing for '${expectedType}'.`,
                DiagnosticSeverity.Error
            );
        }
    }

    private checkUnclosedBlocks() {
        for (const item of this.stack) {
            this.addDiagnostic(
                item.line,
                `Missing closing statement for '${item.type}' block started at line ${item.line + 1}.`,
                DiagnosticSeverity.Error
            );
        }
    }

    private addDiagnostic(line: number, message: string, severity: DiagnosticSeverity) {
        this.diagnostics.push({
            severity,
            range: Range.create(line, 0, line, this.lines[line].length),
            message,
            source: 'SimpleVB'
        });
    }
}
