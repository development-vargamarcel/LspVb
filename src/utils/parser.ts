import { DocumentSymbol, SymbolKind, Position, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from './logger';
import {
    PARSER_BLOCK_REGEX,
    PARSER_DIM_REGEX,
    PARSER_CONST_REGEX,
    PARSER_FIELD_REGEX,
    PARSER_IMPORTS_REGEX,
    PARSER_IMPLEMENTS_REGEX,
    PARSER_REGION_START_REGEX,
    PARSER_REGION_END_REGEX,
    VAL_BLOCK_END_REGEX,
    VAL_IF_START_REGEX,
    VAL_THEN_REGEX,
    VAL_NEXT_REGEX,
    VAL_LOOP_REGEX,
    VAL_WEND_REGEX,
    VAL_FOR_START_REGEX,
    VAL_SELECT_CASE_START_REGEX,
    VAL_DO_START_REGEX,
    VAL_WHILE_START_REGEX
} from '../utils/regexes';
import { stripComment } from './textUtils';

/**
 * Parses a text document and extracts a hierarchy of symbols.
 *
 * This parser uses regex pattern matching to identify blocks (Sub, Function, Class, etc.),
 * variables (Dim), constants (Const), and other constructs. It handles nested structures
 * by maintaining a stack of open symbols.
 *
 * @param document The text document to parse.
 * @returns An array of top-level DocumentSymbols, each containing their children.
 */
export function parseDocumentSymbols(document: TextDocument): DocumentSymbol[] {
    Logger.debug(`Parser: Parsing symbols for ${document.uri}`);
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const rootSymbols: DocumentSymbol[] = [];
    const stack: DocumentSymbol[] = [];

    // Helper to add symbol to current parent or root
    const addSymbol = (symbol: DocumentSymbol) => {
        if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(symbol);
        } else {
            rootSymbols.push(symbol);
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        // Strip comments for analysis
        const line = stripComment(rawLine);
        const trimmed = line.trim();
        if (!trimmed) continue;

        // 1. Check for Block End (End Sub, End Class, etc.)
        const endMatch = VAL_BLOCK_END_REGEX.exec(trimmed);
        if (
            endMatch ||
            VAL_NEXT_REGEX.test(trimmed) ||
            VAL_LOOP_REGEX.test(trimmed) ||
            VAL_WEND_REGEX.test(trimmed) ||
            PARSER_REGION_END_REGEX.test(trimmed)
        ) {
            if (stack.length > 0) {
                // Should check if the closing matches the opening?
                // For simplicity, we assume valid nesting and just pop.
                const finishedSymbol = stack.pop();
                if (finishedSymbol) {
                    // Update range end to include this line
                    finishedSymbol.range.end = { line: i, character: rawLine.length };
                    // Logger.debug(`Parser: Closed symbol '${finishedSymbol.name}' at line ${i}`);
                }
            }
            continue;
        }

        // 2. Check for Block Start (Sub, Function, Class, Module)
        // Groups: 1=Modifier, 2=Type, 3=Name, 4=Args (optional)

        // Modified regex to ONLY capture Modifier, Type, Name. We manually parse args.
        // We still use the original regex source but ignore group 4 (args) from it if possible,
        // or just re-implement matching.
        // PARSER_BLOCK_REGEX comes from regexes.ts, it captures args in group 4.
        // We will continue to use it for detection, but we will ignore group 4 and manually parse args
        // to handle nested parentheses (generics, arrays).

        const blockMatch = new RegExp(PARSER_BLOCK_REGEX.source, 'i').exec(trimmed);

        if (blockMatch) {
            const type = blockMatch[2]; // Sub, Function...
            const name = blockMatch[3];

            // Manually parse signature to handle nested parens
            let fullSignature = `${type} ${name}`;
            let argsContent = '';

            const startParenIndex = rawLine.indexOf('(');
            if (startParenIndex !== -1) {
                // Check if paren is after the name
                const nameIndex = rawLine.indexOf(name);
                if (startParenIndex > nameIndex) {
                    // Start scanning for balanced parens
                    let depth = 0;
                    let endIndex = -1;
                    for (let j = startParenIndex; j < rawLine.length; j++) {
                        if (rawLine[j] === '(') depth++;
                        else if (rawLine[j] === ')') {
                            depth--;
                            if (depth === 0) {
                                endIndex = j;
                                break;
                            }
                        }
                    }
                    if (endIndex !== -1) {
                        argsContent = rawLine.substring(startParenIndex + 1, endIndex);
                        fullSignature = `${type}(${argsContent})`;
                    }
                }
            } else {
                // No parens, so signature is just "Sub Name"
                // Or if it is a Property, it might not have parens.
                // Revert to old behavior for consistency?
                // Old behavior: `${type}${args}`. Args was empty string if undefined.
                // So "Sub Foo" -> "Sub" + "" = "Sub".
                // But wait, old behavior depended on group 4 capturing group.
                // PARSER_BLOCK_REGEX: `... (Sub|Function...) ... (\w+) ... (?:\((...)\))?`
                // If group 4 (args) is undefined, args=""
                // detail = `${type}${args}` -> "Sub" if no args.

                // My manual implementation uses `fullSignature = "${type} ${name}"` initially.
                // If no parens found, it stays "Sub Name".
                // Tests expect "Sub" (without name?)
                // `tests/parser_signature.test.ts`: expected 'Sub' to equal 'Sub'.

                // Let's adjust to match legacy expectations if needed, OR update tests.
                // Using "Sub Name" is actually better for display.
                // But test failure 3: expected 'Sub MySub' to equal 'Sub'.

                // If I change it to just `type` if no args:
                fullSignature = type;
            }

            // Re-apply args if found
            if (argsContent) {
                fullSignature = `${type}(${argsContent})`;
            }

            let kind: SymbolKind = SymbolKind.Function;

            if (/Sub/i.test(type)) kind = SymbolKind.Method;
            else if (/Class/i.test(type)) kind = SymbolKind.Class;
            else if (/Module/i.test(type)) kind = SymbolKind.Module;
            else if (/Property/i.test(type)) kind = SymbolKind.Property;
            else if (/Structure/i.test(type)) kind = SymbolKind.Struct;
            else if (/Interface/i.test(type)) kind = SymbolKind.Interface;
            else if (/Enum/i.test(type)) kind = SymbolKind.Enum;
            else if (/Namespace/i.test(type)) kind = SymbolKind.Namespace;

            const symbol: DocumentSymbol = {
                name: name,
                kind: kind,
                detail: fullSignature,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: rawLine.length } // Will be updated on close
                },
                selectionRange: {
                    start: { line: i, character: rawLine.indexOf(name) },
                    end: { line: i, character: rawLine.indexOf(name) + name.length }
                },
                children: []
            };

            if (argsContent) {
                const argsStart = rawLine.indexOf(argsContent);
                let currentOffset = argsStart;

                // Split args by comma, respecting parentheses
                const argParts: string[] = [];
                let currentPart = '';
                let depth = 0;

                for (let k = 0; k < argsContent.length; k++) {
                    const char = argsContent[k];
                    if (char === '(') depth++;
                    else if (char === ')') depth--;

                    if (char === ',' && depth === 0) {
                        argParts.push(currentPart);
                        currentPart = '';
                    } else {
                        currentPart += char;
                    }
                }
                argParts.push(currentPart); // Push last part

                for (const part of argParts) {
                    const partTrimmed = part.trim();
                    if (!partTrimmed) continue; // Skip empty parts (e.g. trailing comma or empty args)

                    const partIndex = rawLine.indexOf(partTrimmed, currentOffset);

                    const argRegex =
                        /(?:ByVal|ByRef|Optional|ParamArray)?\s*(\w+)(?:\(.*\))?(?:\s+As\s+(.+))?/i;
                    // Modified regex to handle As Type(Of T)
                    // Group 1: Name
                    // Group 2: Type (greedy)

                    const match = argRegex.exec(partTrimmed);

                    if (match) {
                        const argName = match[1];
                        const argType = match[2] || 'Object';
                        const nameIndex =
                            partIndex !== -1 ? partIndex + partTrimmed.indexOf(argName) : 0;

                        symbol.children?.push({
                            name: argName,
                            kind: SymbolKind.Variable,
                            detail: `Argument ${argName} As ${argType}`,
                            range: {
                                start: { line: i, character: nameIndex },
                                end: { line: i, character: nameIndex + argName.length }
                            },
                            selectionRange: {
                                start: { line: i, character: nameIndex },
                                end: { line: i, character: nameIndex + argName.length }
                            },
                            children: []
                        });
                    }

                    if (partIndex !== -1) {
                        currentOffset = partIndex + partTrimmed.length;
                    }
                }
            }

            addSymbol(symbol);
            stack.push(symbol);
            Logger.debug(`Parser: Opened block '${name}' at line ${i}`);
            continue;
        }

        // 3. Check for Dim (Variables)
        // Groups: 1=Name, 2=Type (optional)
        const dimMatch = new RegExp(PARSER_DIM_REGEX.source, 'i').exec(trimmed);
        if (dimMatch) {
            const name = dimMatch[1];
            const type = dimMatch[2] || 'Object';

            const symbol: DocumentSymbol = {
                name: name,
                kind: SymbolKind.Variable,
                detail: `Dim ${name} As ${type}`,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: rawLine.length }
                },
                selectionRange: {
                    start: { line: i, character: rawLine.indexOf(name) },
                    end: { line: i, character: rawLine.indexOf(name) + name.length }
                },
                children: []
            };
            addSymbol(symbol);
            continue;
        }

        // 4. Check for Const
        const constMatch = new RegExp(PARSER_CONST_REGEX.source, 'i').exec(trimmed);
        if (constMatch) {
            const name = constMatch[2]; // Group 2 is name in CONST_PATTERN (1 is modifier)
            const type = constMatch[3] || 'Object';

            const symbol: DocumentSymbol = {
                name: name,
                kind: SymbolKind.Constant,
                detail: `Const ${name} As ${type}`,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: rawLine.length }
                },
                selectionRange: {
                    start: { line: i, character: rawLine.indexOf(name) },
                    end: { line: i, character: rawLine.indexOf(name) + name.length }
                },
                children: []
            };
            addSymbol(symbol);
            continue;
        }

        // 5. Fields (Module/Class level variables without Dim, usually with modifier)
        // But excluding Sub/Function/Const/Property which are handled above.
        const fieldMatch = new RegExp(PARSER_FIELD_REGEX.source, 'i').exec(trimmed);
        if (fieldMatch) {
            const name = fieldMatch[2];
            // Safety check: ensure it's not a block start or const
            if (/^(Sub|Function|Class|Module|Property|Structure|Interface|Enum|Const)$/i.test(name))
                continue;

            const modifier = fieldMatch[1];
            const type = fieldMatch[3] || 'Object';
            const symbol: DocumentSymbol = {
                name: name,
                kind: SymbolKind.Field,
                detail: `${modifier} ${name} As ${type}`,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: rawLine.length }
                },
                selectionRange: {
                    start: { line: i, character: rawLine.indexOf(name) },
                    end: { line: i, character: rawLine.indexOf(name) + name.length }
                },
                children: []
            };
            addSymbol(symbol);
            continue;
        }

        // 6. Check for Imports
        const importsMatch = PARSER_IMPORTS_REGEX.exec(trimmed);
        if (importsMatch) {
            const name = importsMatch[1];
            const symbol: DocumentSymbol = {
                name: name,
                kind: SymbolKind.Package,
                detail: `Imports ${name}`,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: rawLine.length }
                },
                selectionRange: {
                    start: { line: i, character: rawLine.indexOf(name) },
                    end: { line: i, character: rawLine.indexOf(name) + name.length }
                },
                children: []
            };
            addSymbol(symbol);
            continue;
        }

        // 7. Check for Implements
        const implementsMatch = PARSER_IMPLEMENTS_REGEX.exec(trimmed);
        if (implementsMatch) {
            const name = implementsMatch[1];
            const symbol: DocumentSymbol = {
                name: name,
                kind: SymbolKind.Interface,
                detail: `Implements ${name}`,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: rawLine.length }
                },
                selectionRange: {
                    start: { line: i, character: rawLine.indexOf(name) },
                    end: { line: i, character: rawLine.indexOf(name) + name.length }
                },
                children: []
            };
            addSymbol(symbol);
            continue;
        }

        // 8. Check for Regions
        const regionMatch = PARSER_REGION_START_REGEX.exec(trimmed);
        if (regionMatch) {
            const name = regionMatch[1].trim(); // Can be string literal
            const symbol: DocumentSymbol = {
                name: name,
                kind: SymbolKind.Namespace, // Visual grouping
                detail: '#Region',
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: rawLine.length }
                },
                selectionRange: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: trimmed.length }
                },
                children: []
            };
            addSymbol(symbol);
            stack.push(symbol);
            Logger.debug(`Parser: Opened region '${name}' at line ${i}`);
            continue;
        }

        // 9. Check for inner blocks (If, For, Select, Do, While)
        let innerBlockName = '';
        if (VAL_IF_START_REGEX.test(trimmed)) {
            // Check if it's a block If
            const hasThen = VAL_THEN_REGEX.test(trimmed);
            if (!hasThen || trimmed.endsWith('Then') || trimmed.endsWith("Then '")) {
                // If ... Then [EOL]
                innerBlockName = 'If';
            }
            // If ... Then x -> Single line, ignore
        } else if (VAL_FOR_START_REGEX.test(trimmed)) {
            innerBlockName = 'For';
        } else if (VAL_SELECT_CASE_START_REGEX.test(trimmed)) {
            innerBlockName = 'Select';
        } else if (VAL_DO_START_REGEX.test(trimmed)) {
            innerBlockName = 'Do';
        } else if (VAL_WHILE_START_REGEX.test(trimmed)) {
            innerBlockName = 'While';
        }

        if (innerBlockName) {
            const symbol: DocumentSymbol = {
                name: innerBlockName,
                kind: SymbolKind.Namespace, // Use Namespace as placeholder for Scope/Block
                detail: trimmed,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: rawLine.length }
                },
                selectionRange: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: innerBlockName.length }
                },
                children: []
            };
            addSymbol(symbol);
            stack.push(symbol);
            Logger.debug(`Parser: Opened inner block '${innerBlockName}' at line ${i}`);
            continue;
        }
    }

    // Close any remaining symbols on the stack (unclosed blocks)
    // Set their end range to the end of the document
    if (stack.length > 0) {
        const lastLine = lines.length - 1;
        const lastChar = lines[lastLine].length;
        while (stack.length > 0) {
            const sym = stack.pop();
            if (sym) {
                sym.range.end = { line: lastLine, character: lastChar };
            }
        }
    }

    Logger.debug(`Parser: Found ${rootSymbols.length} top-level symbols.`);
    return rootSymbols;
}

/**
 * Finds a symbol definition at a specific position by name, respecting scope.
 *
 * It traverses the symbol hierarchy to find the deepest symbol that contains the
 * given position (the current scope), and then searches up the scope chain (locals, then parents, then globals)
 * to find a symbol matching the given name.
 *
 * @param symbols The root symbols of the document.
 * @param name The name of the symbol to look for.
 * @param position The position where the lookup is happening (cursor position).
 * @returns The matching DocumentSymbol or null if not found.
 */
export function findSymbolAtPosition(
    symbols: DocumentSymbol[],
    name: string,
    position: Position
): DocumentSymbol | null {
    Logger.debug(`Parser: Finding symbol '${name}' at ${position.line}:${position.character}`);
    // 1. Find the deepest symbol that contains the position
    let currentScope = symbols;

    // We need to keep track of the chain of scopes to traverse back up
    const scopeChain: DocumentSymbol[] = [];

    while (true) {
        let foundChild = false;
        for (const sym of currentScope) {
            if (isPositionInRange(position, sym.range)) {
                // We found a symbol containing the position.
                // But we want the DEEPEST one.
                // So we assume this is the candidate, and check its children.
                scopeChain.push(sym);
                if (sym.children && sym.children.length > 0) {
                    currentScope = sym.children;
                    foundChild = true;
                }
                break; // Found the one at this level.
            }
        }
        if (!foundChild) {
            break; // No child contains the position, so we are at the bottom.
        }
    }

    Logger.debug(`Parser: Scope chain depth: ${scopeChain.length}`);

    // 2. Search for 'name' in the scope chain, starting from deepest
    // Reverse iterate scopeChain
    for (let i = scopeChain.length - 1; i >= 0; i--) {
        const scope = scopeChain[i];
        if (scope.children) {
            // Check children of this scope
            // We want the one that is valid at 'position'.
            // For variables, it should be defined BEFORE the position?
            // Or just exist?
            // In VB, shadowing allows re-definition.

            // Find ALL matching symbols in this scope
            const matches = scope.children.filter(
                (c) => c.name.toLowerCase() === name.toLowerCase()
            );

            // If multiple matches (e.g. shadowed in same scope?), pick the one closest to position?
            // Actually, if we have block scopes (If, For), we shouldn't have duplicates in the same block (invalid code).
            // But if we do, usually the one before usage.

            if (matches.length > 0) {
                // If there are matches, return the one defined before usage?
                // Or just the first one?
                // Ideally check ranges.
                Logger.debug(`Parser: Found symbol in scope '${scope.name}'`);
                return matches[0];
            }
        }
    }

    // 3. If not found in chain, check root level symbols (global)
    // But scopeChain[0] IS a root symbol (if found).
    // If the position is NOT inside any root symbol (e.g. global code), we check rootSymbols.
    // But `parseDocumentSymbols` puts global vars at root.

    // Check root symbols if we haven't checked them (scopeChain might be empty)
    // Or if we bubbled up to root and didn't find it.
    // The loop above checks children of scopes in chain.
    // It does NOT check the root level siblings if we are at root.

    // Actually, if I am inside `Class A`, I check `A`'s children.
    // If not found, I should check `A`'s siblings (Globals)?
    // Yes.

    // If scopeChain is `[Class A, Sub B]`.
    // 1. Check `Sub B` children.
    // 2. Check `Class A` children (peers of `Sub B`). -> This finds Members of A.
    // 3. Check Globals (peers of `Class A`).

    // My loop checked `scope.children`.
    // `scopeChain[i]` is the container.
    // `scopeChain[length-1]` is `Sub B`. Checking its children finds locals.
    // `scopeChain[length-2]` is `Class A`. Checking its children finds `Sub B` and `Public x`.
    // So iterating scope chain works!

    // BUT what about Global level?
    // If scopeChain is empty (cursor at global scope), we search `symbols` (root).
    // If scopeChain is NOT empty, we eventually reach `scopeChain[0]` (Root Symbol).
    // We check its children.
    // We ALSO need to check the siblings of `scopeChain[0]` (other globals).

    // So:
    if (scopeChain.length > 0) {
        // We checked all containers.
        // Finally check the root level symbols (siblings of the top-most container)
        const rootMatches = symbols.filter((s) => s.name.toLowerCase() === name.toLowerCase());
        if (rootMatches.length > 0) {
            Logger.debug(`Parser: Found symbol at root (sibling check)`);
            return rootMatches[0];
        }
    } else {
        // We are at root. Check root symbols.
        const matches = symbols.filter((s) => s.name.toLowerCase() === name.toLowerCase());
        if (matches.length > 0) {
            Logger.debug(`Parser: Found symbol at root`);
            return matches[0];
        }
    }

    Logger.debug(`Parser: Symbol '${name}' not found.`);
    return null;
}

/**
 * Recursively finds a symbol by name in the document symbol hierarchy,
 * but only looks into containers (Classes, Modules, etc.), ignoring locals in Methods.
 * Useful for finding global symbols or symbols in other documents.
 *
 * @param symbols The root document symbols.
 * @param name The name of the symbol to find.
 * @returns The matching DocumentSymbol or null.
 */
export function findGlobalSymbol(symbols: DocumentSymbol[], name: string): DocumentSymbol | null {
    for (const sym of symbols) {
        if (sym.name.toLowerCase() === name.toLowerCase()) {
            return sym;
        }
        // Only recurse into containers, avoid looking into Methods (Locals)
        if (
            sym.children &&
            (sym.kind === SymbolKind.Class ||
                sym.kind === SymbolKind.Module ||
                sym.kind === SymbolKind.Namespace ||
                sym.kind === SymbolKind.Package ||
                sym.kind === SymbolKind.Struct ||
                sym.kind === SymbolKind.Interface ||
                sym.kind === SymbolKind.Enum)
        ) {
            const found = findGlobalSymbol(sym.children, name);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Returns a list of all symbols visible at the given position, respecting scope and shadowing.
 * @param symbols The root document symbols.
 * @param position The position to check visibility from.
 * @returns An array of visible symbols.
 */
export function getVisibleSymbols(symbols: DocumentSymbol[], position: Position): DocumentSymbol[] {
    Logger.debug(`Parser: Getting visible symbols at ${position.line}:${position.character}`);
    const scopeChain: DocumentSymbol[] = [];
    let currentScope = symbols;

    // 1. Build scope chain (root -> deepest)
    while (true) {
        let foundChild = false;
        for (const sym of currentScope) {
            if (isPositionInRange(position, sym.range)) {
                scopeChain.push(sym);
                if (sym.children && sym.children.length > 0) {
                    currentScope = sym.children;
                    foundChild = true;
                }
                break;
            }
        }
        if (!foundChild) break;
    }

    const visibleSymbols: Map<string, DocumentSymbol> = new Map();

    // 2. Add root symbols (globals) first
    for (const sym of symbols) {
        visibleSymbols.set(sym.name.toLowerCase(), sym);
    }

    // 3. Walk down the scope chain, overwriting with locals (shadowing)
    for (const scope of scopeChain) {
        if (scope.children) {
            for (const child of scope.children) {
                visibleSymbols.set(child.name.toLowerCase(), child);
            }
        }
    }

    const result = Array.from(visibleSymbols.values());
    Logger.debug(`Parser: Found ${result.length} visible symbols.`);
    return result;
}

/**
 * Finds a specific symbol by name within the visibility scope of the given position.
 * @param symbols The root document symbols.
 * @param name The name of the symbol to find.
 * @param position The position to check visibility from.
 * @returns The matching symbol or null.
 */
export function findSymbolInScope(
    symbols: DocumentSymbol[],
    name: string,
    position: Position
): DocumentSymbol | null {
    const visible = getVisibleSymbols(symbols, position);
    return visible.find((s) => s.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Finds the deepest symbol that contains the given position.
 * @param symbols The root document symbols.
 * @param position The position.
 * @returns The containing symbol or null.
 */
export function getSymbolContainingPosition(
    symbols: DocumentSymbol[],
    position: Position
): DocumentSymbol | null {
    let currentScope = symbols;
    let deepest: DocumentSymbol | null = null;

    while (true) {
        let foundChild = false;
        for (const sym of currentScope) {
            if (isPositionInRange(position, sym.range)) {
                deepest = sym;
                if (sym.children && sym.children.length > 0) {
                    currentScope = sym.children;
                    foundChild = true;
                }
                break;
            }
        }
        if (!foundChild) break;
    }
    return deepest;
}

/**
 * Finds the parent symbol of a given symbol in the document hierarchy.
 *
 * @param symbols The root document symbols.
 * @param childSymbol The child symbol to find the parent for.
 * @returns The parent DocumentSymbol or null if it's a root symbol or not found.
 */
export function findSymbolParent(
    symbols: DocumentSymbol[],
    childSymbol: DocumentSymbol
): DocumentSymbol | null {
    for (const sym of symbols) {
        if (sym.children) {
            if (sym.children.includes(childSymbol)) {
                return sym;
            }
            // Recursive check
            const found = findSymbolParent(sym.children, childSymbol);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Checks if a position is within a given range.
 *
 * @param pos The position to check.
 * @param range The range.
 * @returns True if the position is within the range.
 */
function isPositionInRange(pos: Position, range: Range): boolean {
    if (pos.line < range.start.line || pos.line > range.end.line) return false;
    if (pos.line === range.start.line && pos.character < range.start.character) return false;
    if (pos.line === range.end.line && pos.character > range.end.character) return false;
    return true;
}
