import { DocumentSymbol, SymbolKind, Position } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    PARSER_BLOCK_REGEX,
    PARSER_DIM_REGEX,
    PARSER_CONST_REGEX,
    PARSER_FIELD_REGEX,
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

export function parseDocumentSymbols(document: TextDocument): DocumentSymbol[] {
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
        const line = rawLine.split("'")[0];
        const trimmed = line.trim();
        if (!trimmed) continue;

        // 1. Check for Block End (End Sub, End Class, etc.)
        const endMatch = VAL_BLOCK_END_REGEX.exec(trimmed);
        if (
            endMatch ||
            VAL_NEXT_REGEX.test(trimmed) ||
            VAL_LOOP_REGEX.test(trimmed) ||
            VAL_WEND_REGEX.test(trimmed)
        ) {
            if (stack.length > 0) {
                // Should check if the closing matches the opening?
                // For simplicity, we assume valid nesting and just pop.
                const finishedSymbol = stack.pop();
                if (finishedSymbol) {
                    // Update range end to include this line
                    finishedSymbol.range.end = { line: i, character: rawLine.length };
                }
            }
            continue;
        }

        // 2. Check for Block Start (Sub, Function, Class, Module)
        // Groups: 1=Modifier, 2=Type, 3=Name, 4=Args (optional)

        const blockMatch = new RegExp(PARSER_BLOCK_REGEX.source, 'i').exec(trimmed);

        if (blockMatch) {
            const type = blockMatch[2]; // Sub, Function...
            const name = blockMatch[3];
            const args = blockMatch[4] !== undefined ? `(${blockMatch[4]})` : ''; // Capture args
            let kind: SymbolKind = SymbolKind.Function;

            if (/Sub/i.test(type)) kind = SymbolKind.Method;
            else if (/Class/i.test(type)) kind = SymbolKind.Class;
            else if (/Module/i.test(type)) kind = SymbolKind.Module;
            else if (/Property/i.test(type)) kind = SymbolKind.Property;

            const symbol: DocumentSymbol = {
                name: name,
                kind: kind,
                detail: `${type}${args}`, // Store full signature in detail
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

            if (blockMatch[4]) {
                const argString = blockMatch[4];
                const argsStart = rawLine.indexOf('(') + 1;
                let currentOffset = argsStart;

                const argParts = argString.split(',');
                for (const part of argParts) {
                    const partTrimmed = part.trim();
                    const partIndex = rawLine.indexOf(partTrimmed, currentOffset);

                    const argRegex =
                        /(?:ByVal|ByRef|Optional|ParamArray)?\s*(\w+)(?:\(\))?(?:\s+As\s+(\w+))?/i;
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
            if (/^(Sub|Function|Class|Module|Property|Const)$/i.test(name)) continue;

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

        // 6. Check for inner blocks (If, For, Select, Do, While)
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
            continue;
        }
    }

    return rootSymbols;
}

export function findSymbolAtPosition(
    symbols: DocumentSymbol[],
    name: string,
    position: Position
): DocumentSymbol | null {
    // 1. Find the deepest symbol that contains the position
    const container: DocumentSymbol | null = null;
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
        if (rootMatches.length > 0) return rootMatches[0];
    } else {
        // We are at root. Check root symbols.
        const matches = symbols.filter((s) => s.name.toLowerCase() === name.toLowerCase());
        if (matches.length > 0) return matches[0];
    }

    return null;
}

function isPositionInRange(pos: Position, range: any): boolean {
    if (pos.line < range.start.line || pos.line > range.end.line) return false;
    if (pos.line === range.start.line && pos.character < range.start.character) return false;
    if (pos.line === range.end.line && pos.character > range.end.character) return false;
    return true;
}
