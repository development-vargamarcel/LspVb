import { DocumentSymbol, SymbolKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    PARSER_BLOCK_REGEX,
    PARSER_DIM_REGEX,
    PARSER_CONST_REGEX,
    PARSER_FIELD_REGEX,
    VAL_BLOCK_END_REGEX
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
        if (endMatch) {
            if (stack.length > 0) {
                const finishedSymbol = stack.pop();
                if (finishedSymbol) {
                    // Update range end to include this line
                    finishedSymbol.range.end = { line: i, character: rawLine.length };
                }
            }
            continue;
        }

        // 2. Check for Block Start (Sub, Function, Class, Module)
        // Groups: 1=Modifier, 2=Type, 3=Name
        // Note: PARSER_BLOCK_REGEX is global/multiline, so we need to reset lastIndex or use exec on the string
        // Since we are iterating lines, we should use a fresh regex or match against the line.
        // The PARSER_BLOCK_REGEX in regexes.ts was defined with flags 'gmi'.
        // Using it with exec() on a single line loop can be tricky with 'g'.
        // Let's rely on simple line matching here instead of the exported 'g' regex for safety in this loop structure,
        // OR construct a new RegExp from the source.

        // Actually, looking at the previous implementation, it used `exec` on the line.
        // Let's create a local regex for single line match based on the pattern.

        const blockMatch = new RegExp(PARSER_BLOCK_REGEX.source, 'i').exec(trimmed);

        if (blockMatch) {
            const type = blockMatch[2]; // Sub, Function...
            const name = blockMatch[3];
            let kind: SymbolKind = SymbolKind.Function;

            if (/Sub/i.test(type)) kind = SymbolKind.Method;
            else if (/Class/i.test(type)) kind = SymbolKind.Class;
            else if (/Module/i.test(type)) kind = SymbolKind.Module;
            else if (/Property/i.test(type)) kind = SymbolKind.Property;

            const symbol: DocumentSymbol = {
                name: name,
                kind: kind,
                detail: type,
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
    }

    return rootSymbols;
}
