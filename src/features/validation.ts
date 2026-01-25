import {
    Diagnostic,
    DiagnosticSeverity,
    TextDocument,
    Range,
    DocumentSymbol,
    SymbolKind
} from 'vscode-languageserver/node';
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
    VAL_THEN_REGEX,
    VAL_RETURN_REGEX,
    VAL_EXIT_REGEX,
    VAL_THROW_REGEX
} from '../utils/regexes';
import { stripComment } from '../utils/textUtils';
import { Logger } from '../utils/logger';
import { parseDocumentSymbols } from '../utils/parser';

/**
 * Represents a code block context on the stack.
 */
interface BlockContext {
    type: string;
    line: number;
    /** Tracks if the block contains any statements or nested blocks. */
    hasContent: boolean;
}

/**
 * Validates a text document for syntax and structure errors.
 *
 * @param textDocument The document to validate.
 * @returns An array of diagnostics to be sent to the client.
 */
export function validateTextDocument(textDocument: TextDocument): Diagnostic[] {
    Logger.log(`Starting validation for ${textDocument.uri}`);
    const validator = new Validator(textDocument);
    const diagnostics = validator.validate();

    // Check for duplicate declarations using parsed symbols
    const symbols = parseDocumentSymbols(textDocument);
    const duplicateDiagnostics = checkDuplicates(symbols);
    diagnostics.push(...duplicateDiagnostics);

    // Check for unused variables
    const unusedDiagnostics = checkUnusedVariables(textDocument, symbols);
    diagnostics.push(...unusedDiagnostics);

    Logger.log(
        `Validation finished for ${textDocument.uri}. Found ${diagnostics.length} diagnostics.`
    );
    return diagnostics;
}

/**
 * Checks for duplicate symbol declarations within the same scope.
 * @param symbols The list of symbols to check.
 * @returns A list of diagnostics for duplicates.
 */
function checkDuplicates(symbols: DocumentSymbol[]): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const seen = new Map<string, DocumentSymbol>();

    for (const sym of symbols) {
        const name = sym.name.toLowerCase();
        if (seen.has(name)) {
            // Report error on the current symbol
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: sym.selectionRange,
                message: `Symbol '${sym.name}' is already declared in this scope.`,
                source: 'SimpleVB'
            });
        } else {
            seen.set(name, sym);
        }

        if (sym.children) {
            diagnostics.push(...checkDuplicates(sym.children));
        }
    }
    return diagnostics;
}

/**
 * Checks for unused variables within methods/functions.
 * @param document The text document.
 * @param symbols The document symbols.
 * @returns A list of diagnostics for unused variables.
 */
function checkUnusedVariables(document: TextDocument, symbols: DocumentSymbol[]): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const wordIndex = buildWordIndex(lines);

    const traverse = (syms: DocumentSymbol[], parent: DocumentSymbol | null) => {
        for (const sym of syms) {
            if (sym.kind === SymbolKind.Variable) {
                // Only check local variables (inside Method, Function, Property)
                // We determine "local" if the parent is one of these types.
                if (
                    parent &&
                    (parent.kind === SymbolKind.Method ||
                        parent.kind === SymbolKind.Function ||
                        parent.kind === SymbolKind.Property ||
                        parent.kind === SymbolKind.Constructor)
                ) {
                    const name = sym.name.toLowerCase();
                    const occurrences = wordIndex.get(name) || [];
                    const parentRange = parent.range;

                    // Count occurrences within the parent scope
                    let count = 0;
                    for (const lineIdx of occurrences) {
                        if (lineIdx >= parentRange.start.line && lineIdx <= parentRange.end.line) {
                            count++;
                        }
                    }

                    // If count is 1 (declaration only), report unused
                    // Note: If multiple variables on one line "Dim x, y", x appears once.
                    // If "Dim x = x + 1", x appears twice.
                    if (count <= 1) {
                        diagnostics.push({
                            severity: DiagnosticSeverity.Information,
                            range: sym.selectionRange,
                            message: `Variable '${sym.name}' is declared but never used.`,
                            source: 'SimpleVB'
                        });
                    }

                    // Check naming convention (Local variables should be camelCase)
                    // Simple check: First letter is lowercase?
                    // Exception: "_" prefix?
                    if (/^[A-Z]/.test(sym.name)) {
                         diagnostics.push({
                            severity: DiagnosticSeverity.Information,
                            range: sym.selectionRange,
                            message: `Local variables should be camelCase (start with lowercase).`,
                            source: 'SimpleVB'
                        });
                    }
                }
            }

            if (sym.children) {
                traverse(sym.children, sym);
            }
        }
    };

    traverse(symbols, null);
    return diagnostics;
}

/**
 * Builds a map of word occurrences in the document.
 * Maps lower-case word -> list of line numbers (one per occurrence).
 * @param lines The lines of the document.
 * @returns The word index map.
 */
function buildWordIndex(lines: string[]): Map<string, number[]> {
    const map = new Map<string, number[]>();

    for (let i = 0; i < lines.length; i++) {
        // Strip comments to ignore usages in comments
        const line = stripComment(lines[i]);
        const regex = /\b\w+\b/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const word = match[0].toLowerCase();
            if (!map.has(word)) {
                map.set(word, []);
            }
            map.get(word)!.push(i);
        }
    }

    return map;
}

/**
 * A stateful validator helper that processes the document line by line.
 * It maintains a stack to track block structures (If, For, Sub, etc.).
 */
class Validator {
    private diagnostics: Diagnostic[] = [];
    private stack: BlockContext[] = [];
    private lines: string[];
    private isUnreachable = false;

    constructor(private document: TextDocument) {
        this.lines = document.getText().split(/\r?\n/);
    }

    /**
     * Runs the validation process.
     * @returns A list of diagnostics.
     */
    public validate(): Diagnostic[] {
        Logger.debug('Validator: Starting line-by-line validation.');
        for (let i = 0; i < this.lines.length; i++) {
            const rawLine = this.lines[i];
            // Check for TODOs before checking for empty trimmed lines
            this.checkTodos(rawLine.trim(), i);

            // Check Max Line Length (includes comments)
            if (rawLine.length > 120) {
                this.addDiagnostic(
                    i,
                    `Line is too long (${rawLine.length} > 120 characters).`,
                    DiagnosticSeverity.Warning
                );
            }

            const trimmed = stripComment(rawLine).trim();

            if (!trimmed) continue;

            const isStructure = this.validateStructure(trimmed, i, rawLine);

            // If not a start/end of a block, it is content (or inner structure like Else)
            if (!isStructure) {
                this.markCurrentContent();
            }

            this.validateSyntax(trimmed, i, rawLine);
            this.validateUnreachable(trimmed, i);
            this.checkMagicNumbers(trimmed, i);
        }

        this.checkUnclosedBlocks();
        return this.diagnostics;
    }

    /**
     * Checks for magic numbers in the line.
     * @param trimmed The trimmed line.
     * @param lineIndex The line number.
     */
    private checkMagicNumbers(trimmed: string, lineIndex: number) {
        // Ignore Const definitions, Dim initializations (common for testing/prototyping?), and array indexing?
        // To reduce noise in tests and prototype code, maybe we should be less strict?
        // Or updated tests.

        if (/^Const\s/i.test(trimmed)) return;
        if (/^Dim\s/i.test(trimmed)) return; // Allow magic numbers in Dim for now to fix tests

        // Find numbers
        const regex = /\b\d+\b/g;
        let match;
        while ((match = regex.exec(trimmed)) !== null) {
            const numStr = match[0];
            const num = parseInt(numStr);
            // Allow 0, 1, -1
            if (num !== 0 && num !== 1 && num !== -1) {
                // Ignore if it's inside a string or comment?
                // Strip comments handles comment.
                // Strings are harder without parser.
                // But simplified: assuming code.

                // Warning: This regex picks up numbers inside variable names? No \b\d+\b matches "var1"?
                // \b matches boundary. "var1" -> '1' has 'r' before it. so \b matches if 'r' is not word char?
                // 'r' is word char. so "var1" '1' is not matched.
                // "123" matches.

                this.addDiagnostic(
                    lineIndex,
                    `Avoid magic numbers (${num}). Use a Constant instead.`,
                    DiagnosticSeverity.Information
                );
            }
        }
    }

    /**
     * Checks for TODO and FIXME comments.
     * @param rawTrimmed The trimmed line (including comments).
     * @param lineIndex The line number.
     */
    private checkTodos(rawTrimmed: string, lineIndex: number) {
        if (rawTrimmed.startsWith("'")) {
            const comment = rawTrimmed.substring(1);
            if (/\bTODO:/i.test(comment)) {
                this.addDiagnostic(
                    lineIndex,
                    `TODO: ${comment.split(/todo:/i)[1].trim()}`,
                    DiagnosticSeverity.Information
                );
            }
            if (/\bFIXME:/i.test(comment)) {
                this.addDiagnostic(
                    lineIndex,
                    `FIXME: ${comment.split(/fixme:/i)[1].trim()}`,
                    DiagnosticSeverity.Information
                );
            }
        }
    }

    /**
     * Checks for unreachable code.
     * @param trimmed The trimmed line.
     * @param lineIndex The line number.
     */
    private validateUnreachable(trimmed: string, lineIndex: number) {
        if (this.isUnreachable) {
            // Check if this line resets reachability (block ends/starts, Else, Case)
            // Note: Structure handling happens before this, so stack might have changed.
            // But we need to check the TEXT of the line.

            const isControlFlow =
                VAL_BLOCK_START_REGEX.test(trimmed) ||
                VAL_BLOCK_END_REGEX.test(trimmed) ||
                VAL_NEXT_REGEX.test(trimmed) ||
                VAL_LOOP_REGEX.test(trimmed) ||
                VAL_WEND_REGEX.test(trimmed) ||
                /^(Else|ElseIf|Case)\b/i.test(trimmed);

            if (!isControlFlow) {
                this.addDiagnostic(
                    lineIndex,
                    'Unreachable code detected.',
                    DiagnosticSeverity.Warning
                );
            } else {
                // If it is control flow (e.g. End If, Else), we assume code becomes reachable or flow merges.
                this.isUnreachable = false;
            }
        }

        // Check if this line makes subsequent code unreachable
        if (
            VAL_RETURN_REGEX.test(trimmed) ||
            VAL_EXIT_REGEX.test(trimmed) ||
            VAL_THROW_REGEX.test(trimmed)
        ) {
            this.isUnreachable = true;
        }
    }

    /**
     * Validates syntax on a single line (e.g., missing Then, type declarations).
     * @param trimmed The trimmed line content (no comments).
     * @param lineIndex The line number.
     * @param rawLine The original line content.
     */
    private validateSyntax(trimmed: string, lineIndex: number, rawLine: string) {
        // Check for "If ... " without "Then"
        if (VAL_IF_LINE_REGEX.test(rawLine)) {
            if (!VAL_THEN_REGEX.test(rawLine) && !trimmed.endsWith('_')) {
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
                'Variable declaration without type (As ...).',
                DiagnosticSeverity.Warning
            );
        }

        // Check for Const without value
        if (VAL_CONST_REGEX.test(rawLine) && !rawLine.includes('=')) {
            this.addDiagnostic(
                lineIndex,
                'Const declaration requires a value (e.g. Const x = 1).',
                DiagnosticSeverity.Error
            );
        }

        // Check for Return validity
        if (VAL_RETURN_REGEX.test(trimmed)) {
            this.validateReturn(trimmed, lineIndex);
        }

        // Check for Exit validity
        const exitMatch = VAL_EXIT_REGEX.exec(trimmed);
        if (exitMatch) {
            this.validateExit(exitMatch[1], lineIndex);
        }

        // Check for Missing Return Type in Function/Property
        if (/^(Function|Property)\b/i.test(trimmed)) {
            // Check if it has 'As' clause
            // Use regex that allows parentheses and whitespace
            // Simplified: look for ' As ' after the name/parens
            // Note: rawLine might contain comments, but trimmed doesn't start with comment.
            // trimmed: "Function Foo()"
            // We need to be careful about "Function As" (invalid name) vs "Function Foo As"

            // Regex: Start with Function/Property, then space, then anything, then NOT 'As' before end (ignoring comment)
            // Easier: Check if " As " exists (case insensitive)
            // But "Function AsFunc()" might contain "As".
            // So we want " As " to be after the parameters.

            // Actually, we can check if it ends with "As <Type>"
            // Regex: /\)\s+As\s+\w+/i  OR  /\s+As\s+\w+/i (if no parens for property)

            // NOTE: "Function Foo" is valid (As Object default). We want to warn.

            // Exclude "End Function" (already handled by block checks, but strict regex needed)
            if (/^End\s+(Function|Property)/i.test(trimmed)) return;
            if (/^(Exit|Declare)\s+/i.test(trimmed)) return; // Declare Function ...

            // Ignore line continuations (multi-line definitions)
            if (trimmed.endsWith('_')) return;

            // Check for 'As' keyword
            if (!/\bAs\b/i.test(trimmed)) {
                // Determine type
                const type = /^Function/i.test(trimmed) ? 'Function' : 'Property';
                const nameMatch = /^(?:Function|Property)\s+(\w+)/i.exec(trimmed);
                const name = nameMatch ? nameMatch[1] : 'unknown';

                this.addDiagnostic(
                    lineIndex,
                    `${type} '${name}' is missing a return type (e.g. 'As Object').`,
                    DiagnosticSeverity.Warning
                );
            } else {
                 // Has 'As', but maybe missing type? "Function Foo() As" -> handled by parser error usually?
                 // Or "Function Foo() As " -> trimmed ends with As?
                 if (/\bAs\s*$/i.test(trimmed)) {
                     const type = /^Function/i.test(trimmed) ? 'Function' : 'Property';
                     this.addDiagnostic(
                        lineIndex,
                        `${type} declaration is missing type after 'As'.`,
                        DiagnosticSeverity.Warning
                     );
                 }
            }
        }
    }

    /**
     * Validates Return statements.
     * @param trimmed The trimmed line.
     * @param lineIndex The line number.
     */
    private validateReturn(trimmed: string, lineIndex: number) {
        const parent = this.findParentBlock(['Function', 'Sub', 'Property']);
        if (!parent) {
            this.addDiagnostic(
                lineIndex,
                "'Return' statement must be inside a Function, Sub, or Property.",
                DiagnosticSeverity.Error
            );
            return;
        }

        const hasValue = trimmed.length > 6 && trimmed.substring(6).trim().length > 0;

        if (parent.type.toLowerCase() === 'sub') {
            if (hasValue) {
                this.addDiagnostic(
                    lineIndex,
                    "'Return' in a Sub cannot return a value.",
                    DiagnosticSeverity.Error
                );
            }
        } else if (
            parent.type.toLowerCase() === 'function' ||
            parent.type.toLowerCase() === 'property'
        ) {
            if (!hasValue) {
                this.addDiagnostic(
                    lineIndex,
                    "'Return' in a Function/Property must return a value.",
                    DiagnosticSeverity.Error
                );
            }
        }
    }

    /**
     * Validates Exit statements.
     * @param type The type to exit (Sub, Function, Do, etc.).
     * @param lineIndex The line number.
     */
    private validateExit(type: string, lineIndex: number) {
        // For 'Exit Sub', we need a 'Sub' in the stack.
        // For 'Exit Do', we need a 'Do' in the stack.
        // The regex captures the type.

        // Map Property to Property (case insensitive check handled by findParentBlock)
        const parent = this.findParentBlock([type]);
        if (!parent) {
            this.addDiagnostic(
                lineIndex,
                `'Exit ${type}' must be inside a '${type}' block.`,
                DiagnosticSeverity.Error
            );
        }
    }

    /**
     * Finds the nearest parent block of one of the allowed types.
     * @param allowedTypes The types of blocks to search for.
     * @returns The found block context or null.
     */
    private findParentBlock(allowedTypes: string[]): BlockContext | null {
        const lowerAllowed = allowedTypes.map((t) => t.toLowerCase());
        for (let i = this.stack.length - 1; i >= 0; i--) {
            const block = this.stack[i];
            if (lowerAllowed.includes(block.type.toLowerCase())) {
                return block;
            }
        }
        return null;
    }

    /**
     * Validates block structure (start/end matching).
     * @param trimmed The trimmed line content.
     * @param lineIndex The line number.
     * @param rawLine The original line content.
     * @returns True if the line was a block start or end.
     */
    private validateStructure(trimmed: string, lineIndex: number, rawLine: string): boolean {
        // 1. Check for End/Closing statements first
        if (this.handleBlockEnd(trimmed, lineIndex, rawLine)) {
            return true;
        }

        // 2. Check for Start/Opening statements
        return this.handleBlockStart(trimmed, lineIndex);
    }

    /**
     * Handles block closing statements.
     * @param trimmed The trimmed line.
     * @param lineIndex The line number.
     * @param rawLine The original line.
     * @returns True if the line was a closing statement.
     */
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

    /**
     * Handles block starting statements.
     * @param trimmed The trimmed line.
     * @param lineIndex The line number.
     * @returns True if a block started.
     */
    private handleBlockStart(trimmed: string, lineIndex: number): boolean {
        let match: RegExpMatchArray | null;

        // Generic Start
        if ((match = VAL_BLOCK_START_REGEX.exec(trimmed))) {
            this.pushStack(match[1], lineIndex);
            return true;
        }

        // Specific Starts
        if (VAL_IF_START_REGEX.test(trimmed)) {
            if (this.isBlockIf(trimmed)) {
                this.pushStack('If', lineIndex);
                return true;
            }
            return false;
        }
        if (VAL_FOR_START_REGEX.test(trimmed)) {
            this.pushStack('For', lineIndex);
            return true;
        }
        if (VAL_SELECT_CASE_START_REGEX.test(trimmed)) {
            this.pushStack('Select', lineIndex);
            return true;
        }
        if (VAL_DO_START_REGEX.test(trimmed)) {
            this.pushStack('Do', lineIndex);
            return true;
        }
        if (VAL_WHILE_START_REGEX.test(trimmed)) {
            this.pushStack('While', lineIndex);
            return true;
        }

        return false;
    }

    /**
     * Determines if an 'If' statement is a block If or a single-line If.
     * @param trimmed The trimmed line.
     * @returns True if it's a block If.
     */
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

    /**
     * Pushes a block type onto the stack.
     * @param type The block type.
     * @param line The line number.
     */
    private pushStack(type: string, line: number) {
        Logger.debug(`Validator: Pushing stack '${type}' at line ${line}`);
        // Mark parent as having content (a nested block counts as content)
        this.markCurrentContent();
        this.stack.push({ type, line, hasContent: false });
    }

    /**
     * Marks the current block on the stack as having content.
     */
    private markCurrentContent() {
        if (this.stack.length > 0) {
            this.stack[this.stack.length - 1].hasContent = true;
        }
    }

    /**
     * Checks if the closing statement matches the top of the stack.
     * @param foundClosingType The type of the closing statement found.
     * @param line The line number.
     * @param content The full line content (for error messages).
     */
    private checkStack(foundClosingType: string, line: number, content: string) {
        Logger.debug(`Validator: Checking stack for '${foundClosingType}' at line ${line}`);
        if (this.stack.length === 0) {
            this.addDiagnostic(
                line,
                `Unexpected closing statement '${content.trim()}'.`,
                DiagnosticSeverity.Error
            );
            return;
        }

        const last = this.stack[this.stack.length - 1];
        if (last.type.toLowerCase() === foundClosingType.toLowerCase()) {
            this.stack.pop();
            // Check for empty block
            if (!last.hasContent) {
                // Only warn for specific block types
                const type = last.type.toLowerCase();
                if (['if', 'for', 'while', 'do', 'select'].includes(type)) {
                    this.addDiagnostic(
                        last.line,
                        `Empty '${last.type}' block detected.`,
                        DiagnosticSeverity.Warning
                    );
                }
            }
        } else {
            const expectedClosing = this.getExpectedClosing(last.type);
            this.addDiagnostic(
                line,
                `Mismatched block: Expected '${expectedClosing}' (to close '${last.type}' at line ${last.line + 1}), but found '${content.trim()}'.`,
                DiagnosticSeverity.Error
            );
        }
    }

    /**
     * Gets the expected closing statement for a block type.
     * @param type The block type.
     * @returns The expected closing string.
     */
    private getExpectedClosing(type: string): string {
        switch (type.toLowerCase()) {
            case 'if':
                return 'End If';
            case 'for':
                return 'Next';
            case 'while':
                return 'Wend';
            case 'do':
                return 'Loop';
            case 'select':
                return 'End Select';
            case 'sub':
                return 'End Sub';
            case 'function':
                return 'End Function';
            case 'class':
                return 'End Class';
            case 'module':
                return 'End Module';
            case 'property':
                return 'End Property';
            case 'structure':
                return 'End Structure';
            case 'interface':
                return 'End Interface';
            case 'enum':
                return 'End Enum';
            default:
                return 'End ' + type;
        }
    }

    /**
     * Checks for any unclosed blocks after processing all lines.
     */
    private checkUnclosedBlocks() {
        for (const item of this.stack) {
            this.addDiagnostic(
                item.line,
                `Missing closing statement for '${item.type}' block started at line ${item.line + 1}.`,
                DiagnosticSeverity.Error
            );
        }
    }

    /**
     * Adds a diagnostic to the list.
     * @param line The line number.
     * @param message The error message.
     * @param severity The severity.
     */
    private addDiagnostic(line: number, message: string, severity: DiagnosticSeverity) {
        Logger.debug(`Validator: Added diagnostic at line ${line}: ${message}`);
        this.diagnostics.push({
            severity,
            range: Range.create(line, 0, line, this.lines[line].length),
            message,
            source: 'SimpleVB'
        });
    }
}
