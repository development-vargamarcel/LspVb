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
    VAL_THROW_REGEX,
    VAL_ASSIGNMENT_REGEX,
    VAL_CATCH_REGEX,
    VAL_FINALLY_REGEX
} from '../utils/regexes';
import { stripComment } from '../utils/textUtils';
import { Logger } from '../utils/logger';
import { parseDocumentSymbols, findSymbolInScope, findGlobalSymbol } from '../utils/parser';

/**
 * List of built-in VB types to ignore during validation.
 */
const BUILTIN_TYPES = new Set([
    'boolean',
    'byte',
    'char',
    'date',
    'decimal',
    'double',
    'integer',
    'long',
    'object',
    'sbyte',
    'short',
    'single',
    'string',
    'uinteger',
    'ulong',
    'ushort',
    'variant',
    'void',
    'int',
    'bool'
]);

/**
 * Represents a code block context on the stack.
 */
interface BlockContext {
    type: string;
    line: number;
    /** Tracks if the block contains any statements or nested blocks. */
    hasContent: boolean;
    /** Tracks the specific part of the block (e.g. Try, Catch, Else). */
    part?: string;
}

/**
 * Validates a text document for syntax and structure errors.
 *
 * @param textDocument The document to validate.
 * @param allDocuments Optional list of all open documents for cross-file checks.
 * @returns An array of diagnostics to be sent to the client.
 */
export function validateTextDocument(
    textDocument: TextDocument,
    allDocuments: TextDocument[] = [textDocument]
): Diagnostic[] {
    Logger.log(`Starting validation for ${textDocument.uri}`);
    if (allDocuments.length > 1) {
        Logger.debug(`Validation context includes ${allDocuments.length} documents.`);
    }
    // Check for duplicate declarations using parsed symbols
    const symbols = parseDocumentSymbols(textDocument);

    const validator = new Validator(textDocument, symbols, allDocuments);
    const diagnostics = validator.validate();

    const duplicateDiagnostics = checkDuplicates(symbols);
    diagnostics.push(...duplicateDiagnostics);

    // Check for duplicate declarations across files
    if (allDocuments.length > 1) {
        const crossFileDiagnostics = checkCrossFileDuplicates(textDocument, symbols, allDocuments);
        diagnostics.push(...crossFileDiagnostics);
    }

    // Check for unused variables
    const unusedDiagnostics = checkUnusedVariables(textDocument, symbols);
    diagnostics.push(...unusedDiagnostics);

    // Check for interface implementation
    const interfaceDiagnostics = checkInterfaces(textDocument, symbols, allDocuments);
    diagnostics.push(...interfaceDiagnostics);

    Logger.log(
        `Validation finished for ${textDocument.uri}. Found ${diagnostics.length} diagnostics.`
    );
    return diagnostics;
}

/**
 * Checks for missing interface implementations.
 * @param document The text document.
 * @param symbols The document symbols.
 * @param allDocuments All open documents.
 * @returns A list of diagnostics.
 */
function checkInterfaces(
    document: TextDocument,
    symbols: DocumentSymbol[],
    allDocuments: TextDocument[]
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const traverse = (syms: DocumentSymbol[]) => {
        for (const sym of syms) {
            if (sym.kind === SymbolKind.Class || sym.kind === SymbolKind.Struct) {
                // Check for Implements
                const implementsSyms = sym.children?.filter((c) => c.kind === SymbolKind.Interface);

                if (implementsSyms && implementsSyms.length > 0) {
                    for (const impl of implementsSyms) {
                        const interfaceName = impl.name.replace(/^Implements\s+/, '');
                        const position = impl.range.start;
                        Logger.debug(`Checking interface '${interfaceName}' for class '${sym.name}'`);

                        // Resolve interface
                        let interfaceSym = findSymbolInScope(symbols, interfaceName, position);

                        if (!interfaceSym) {
                            // Check other docs
                            for (const doc of allDocuments) {
                                if (doc.uri === document.uri) continue;
                                const globalSyms = parseDocumentSymbols(doc);
                                interfaceSym = findGlobalSymbol(globalSyms, interfaceName);
                                if (interfaceSym) break;
                            }
                        }

                        if (!interfaceSym) {
                            diagnostics.push({
                                severity: DiagnosticSeverity.Error,
                                range: impl.selectionRange,
                                message: `Interface '${interfaceName}' not defined.`,
                                source: 'SimpleVB'
                            });
                            continue;
                        }

                        // Check members
                        if (interfaceSym.children) {
                            Logger.debug(
                                `Interface '${interfaceName}' has ${interfaceSym.children.length} members.`
                            );
                            for (const member of interfaceSym.children) {
                                if (
                                    member.kind === SymbolKind.Method ||
                                    member.kind === SymbolKind.Property ||
                                    member.kind === SymbolKind.Function
                                ) {
                                    const classHasMember = sym.children?.some(
                                        (c) => c.name.toLowerCase() === member.name.toLowerCase()
                                    );

                                    if (!classHasMember) {
                                        diagnostics.push({
                                            severity: DiagnosticSeverity.Error,
                                            range: sym.selectionRange,
                                            message: `Class '${sym.name}' must implement member '${member.name}' of interface '${interfaceName}'.`,
                                            source: 'SimpleVB',
                                            data: {
                                                missingMember: member.name,
                                                interfaceName: interfaceName,
                                                memberKind: member.kind,
                                                memberDetail: member.detail
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (sym.children) {
                traverse(sym.children);
            }
        }
    };

    traverse(symbols);
    return diagnostics;
}

/**
 * Checks for duplicate symbol declarations across files.
 * @param currentDocument The current document.
 * @param currentSymbols The symbols in the current document.
 * @param allDocuments All open documents.
 * @returns A list of diagnostics.
 */
function checkCrossFileDuplicates(
    currentDocument: TextDocument,
    currentSymbols: DocumentSymbol[],
    allDocuments: TextDocument[]
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Only check top-level symbols (Classes, Modules, Enums, etc.)
    // We don't want to check Methods or Fields unless they are global?
    // In VB, Classes/Modules are top level.

    for (const sym of currentSymbols) {
        if (
            sym.kind === SymbolKind.Class ||
            sym.kind === SymbolKind.Module ||
            sym.kind === SymbolKind.Interface ||
            sym.kind === SymbolKind.Enum ||
            sym.kind === SymbolKind.Struct
        ) {
            const name = sym.name.toLowerCase();

            // Check other docs
            for (const doc of allDocuments) {
                if (doc.uri === currentDocument.uri) continue;

                const otherSymbols = parseDocumentSymbols(doc);
                // Check if any top-level symbol matches
                const duplicate = otherSymbols.find(
                    (s) => s.name.toLowerCase() === name && s.kind === sym.kind
                );

                if (duplicate) {
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: sym.selectionRange,
                        message: `Symbol '${sym.name}' is already declared in '${doc.uri}'.`,
                        source: 'SimpleVB'
                    });
                    // Only report once per symbol per validation run to avoid noise
                    break;
                }
            }
        }
    }

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
    private allDocuments: TextDocument[] = [];

    constructor(
        private document: TextDocument,
        private symbols: DocumentSymbol[],
        allDocuments: TextDocument[] = []
    ) {
        this.lines = document.getText().split(/\r?\n/);
        this.allDocuments = allDocuments;
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
            this.checkConstAssignment(trimmed, i, rawLine);
            this.checkUnknownTypes(trimmed, i, rawLine);
        }

        this.checkUnclosedBlocks();
        return this.diagnostics;
    }

    /**
     * Checks for unknown types in declarations (Dim, Const, Function, Property, Field).
     * @param trimmed The trimmed line.
     * @param lineIndex The line number.
     * @param rawLine The original line.
     */
    private checkUnknownTypes(trimmed: string, lineIndex: number, rawLine: string) {
        Logger.debug(`Validator: Checking unknown types for line ${lineIndex}`);
        // Regex to match "As Type"
        // Need to handle "Dim x As Type", "Function f() As Type", "Property p As Type"
        // Also arrays "As Type()" or generics "As List(Of T)" (simple check for base type)
        // Also qualified names "As System.String"

        // Skip comments? trimmed is stripped of comments.

        // Regex: \bAs\s+([\w.]+)(?:\(.*\))?
        // Matches "As Word", "As A.B", but stops at parens or whitespace.

        const matches = Array.from(trimmed.matchAll(/\bAs\s+([\w.]+)/gi));

        for (const match of matches) {
            const typeName = match[1];

            // If typeName ends with dot (regex greediness?), trim it.
            // \w includes alphanumeric and _. dot is literal.
            // If code is "As MyClass." (incomplete), we ignore.
            if (typeName.endsWith('.')) continue;

            // 1. Check built-ins
            if (BUILTIN_TYPES.has(typeName.toLowerCase())) continue;

            // Allow System.* and Microsoft.* namespaces
            if (typeName.startsWith('System.') || typeName.startsWith('Microsoft.')) continue;

            // 2. Check if type exists in scope (Classes, Enums, Interfaces, Structs)
            // Handle Qualified Names (e.g., MyLib.MyClass)
            const parts = typeName.split('.');
            const firstPart = parts[0];

            // Determine position for scope check
            const asIndex = rawLine.toLowerCase().indexOf('as ' + typeName.toLowerCase());
            const col = asIndex !== -1 ? asIndex : 0;
            const position = { line: lineIndex, character: col };

            // Resolve the first part
            let currentSymbol = findSymbolInScope(this.symbols, firstPart, position);

            // If not found locally, check globals (other docs)
            if (!currentSymbol) {
                for (const doc of this.allDocuments) {
                    if (doc.uri === this.document.uri) continue;
                    const globalSyms = parseDocumentSymbols(doc);
                    currentSymbol = findGlobalSymbol(globalSyms, firstPart);
                    if (currentSymbol) break;
                }
            }

            // If still not found, then it's an error (unless it's a built-in like System which we might miss)
            // But if we found the first part, we traverse the rest.

            if (currentSymbol) {
                let valid = true;
                // Traverse remaining parts
                for (let i = 1; i < parts.length; i++) {
                    const nextPart = parts[i];
                    if (currentSymbol && currentSymbol.children) {
                        const child: DocumentSymbol | undefined = currentSymbol.children.find(
                            (c) => c.name.toLowerCase() === nextPart.toLowerCase()
                        );
                        if (child) {
                            currentSymbol = child;
                        } else {
                            valid = false;
                            break;
                        }
                    } else {
                        valid = false;
                        break;
                    }
                }

                if (valid && currentSymbol) {
                    // Check if the final symbol is a valid type or namespace
                    if (
                        currentSymbol.kind === SymbolKind.Class ||
                        currentSymbol.kind === SymbolKind.Interface ||
                        currentSymbol.kind === SymbolKind.Enum ||
                        currentSymbol.kind === SymbolKind.Struct ||
                        currentSymbol.kind === SymbolKind.Namespace ||
                        currentSymbol.kind === SymbolKind.Module // Modules can sometimes be used as type containers or types
                    ) {
                        continue;
                    }
                }
            }

            // 4. Report error
            // Find range of type name
            // const startIndex = match.index! + match[0].lastIndexOf(typeName);
            // This index is relative to trimmed string.
            // We need relative to rawLine.
            // Be careful if multiple "As" on same line?

            // Simple fallback: if type is unknown, just report it.
            this.addDiagnostic(
                lineIndex,
                `Type '${typeName}' is not defined.`,
                DiagnosticSeverity.Warning // Warning for now, as we might miss imports or system libs
            );
        }
    }

    /**
     * Checks if a constant is being assigned a value.
     * @param trimmed The trimmed line.
     * @param lineIndex The line number.
     * @param rawLine The original line.
     */
    private checkConstAssignment(trimmed: string, lineIndex: number, rawLine: string) {
        // Check for assignment: x = 1
        const match = VAL_ASSIGNMENT_REGEX.exec(trimmed);
        if (match) {
            // Ignore Dim x = ...
            if (/^Dim\s/i.test(trimmed)) return;
            // Ignore Const x = ... (declaration)
            if (/^Const\s/i.test(trimmed)) return;

            const varName = match[1];

            // Find the symbol definition
            // We need the position of the variable usage
            const col = rawLine.indexOf(varName);
            // findSymbolInScope expects position of usage
            const position = { line: lineIndex, character: col };

            const symbol = findSymbolInScope(this.symbols, varName, position);

            if (symbol && symbol.kind === SymbolKind.Constant) {
                this.addDiagnostic(
                    lineIndex,
                    `Cannot assign to constant '${varName}'.`,
                    DiagnosticSeverity.Error
                );
            }
        }
    }

    /**
     * Checks for magic numbers in the line.
     * @param trimmed The trimmed line.
     * @param lineIndex The line number.
     */
    private checkMagicNumbers(trimmed: string, lineIndex: number) {
        Logger.debug(`Validator: Checking magic numbers for line ${lineIndex}`);
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
                /^(Else|ElseIf|Case|Catch|Finally)\b/i.test(trimmed);

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
                Logger.debug(`Validator: Missing 'Then' at line ${lineIndex}`);
                this.addDiagnostic(
                    lineIndex,
                    "Missing 'Then' in If statement.",
                    DiagnosticSeverity.Error
                );
            }
        }

        // Check for "Dim x" without "As"
        if (VAL_DIM_REGEX.test(trimmed)) {
            Logger.debug(`Validator: Variable without type at line ${lineIndex}`);
            this.addDiagnostic(
                lineIndex,
                'Variable declaration without type (As ...).',
                DiagnosticSeverity.Warning
            );
        }

        // Check for Const without value
        if (VAL_CONST_REGEX.test(rawLine) && !rawLine.includes('=')) {
            Logger.debug(`Validator: Const without value at line ${lineIndex}`);
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

        // 2. Check for Intermediate statements (Catch, Finally, Else...)
        // Note: Else/ElseIf/Case are currently treated as content or not handled structurally in detail,
        // but for Catch/Finally we want to track them.
        if (this.handleIntermediate(trimmed, lineIndex)) {
            return true;
        }

        // 3. Check for Start/Opening statements
        return this.handleBlockStart(trimmed, lineIndex);
    }

    /**
     * Handles intermediate block statements like Catch, Finally.
     */
    private handleIntermediate(trimmed: string, lineIndex: number): boolean {
        if (VAL_CATCH_REGEX.test(trimmed)) {
            this.checkAndResetBlock('Try', 'Catch', lineIndex);
            return true;
        }
        if (VAL_FINALLY_REGEX.test(trimmed)) {
            this.checkAndResetBlock('Try', 'Finally', lineIndex);
            return true;
        }
        return false;
    }

    /**
     * Checks the current block content and resets for the new part (e.g. Try -> Catch).
     */
    private checkAndResetBlock(expectedType: string, newPart: string, lineIndex: number) {
        if (this.stack.length === 0) return;
        const last = this.stack[this.stack.length - 1];
        if (last.type.toLowerCase() === expectedType.toLowerCase()) {
            if (!last.hasContent) {
                // Report empty block for the previous part
                const partName = last.part || last.type;
                this.addDiagnostic(
                    last.line, // Or the line where the previous part started?
                    // Ideally we report on the previous part's start line, but we don't track it easily.
                    // We report on the current line (Catch) saying previous was empty?
                    // Or we assume the diagnostic shows "Empty Catch block" at the end of the block.
                    // Let's report "Empty 'Try' block detected."
                    `Empty '${partName}' block detected.`,
                    DiagnosticSeverity.Information // Info or Warning?
                );
            }
            // Reset for new part
            last.hasContent = false;
            last.part = newPart;
            // Update line? No, keep the start of the whole block (Try) or update to Catch line?
            // If we update line, then checkStack (End Try) will report for "Catch started at line X".
            last.line = lineIndex;
        }
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
        // If parent is Interface, do not push Sub/Function/Property to stack
        if (this.stack.length > 0) {
            const parent = this.stack[this.stack.length - 1];
            if (parent.type.toLowerCase() === 'interface') {
                if (/^(Sub|Function|Property|Event)$/i.test(type)) {
                    return;
                }
            }
        }

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
                if (['if', 'for', 'while', 'do', 'select', 'try'].includes(type)) {
                    // Use part name if available (e.g. Catch, Finally)
                    const partName = last.part || last.type;

                    let severity: DiagnosticSeverity = DiagnosticSeverity.Warning;
                    if (
                        type === 'try' ||
                        partName.toLowerCase() === 'catch' ||
                        partName.toLowerCase() === 'finally'
                    ) {
                        severity = DiagnosticSeverity.Information;
                    }

                    this.addDiagnostic(
                        last.line,
                        `Empty '${partName}' block detected.`,
                        severity
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
            case 'try':
                return 'End Try';
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
