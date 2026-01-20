import { DocumentSymbol, SymbolKind, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

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
        const endMatch = /^\s*End\s+(Sub|Function|Class|Module|Property)\b/i.exec(trimmed);
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
        const blockMatch = /^\s*(?:(Public|Private|Friend|Protected)\s+)?(Sub|Function|Class|Module|Property)\s+(\w+)/i.exec(trimmed);
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
        const dimMatch = /^\s*Dim\s+(\w+)(?:.*?As\s+(\w+))?/i.exec(trimmed);
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
        const constMatch = /^\s*(?:(?:Public|Private|Friend|Protected)\s+)?Const\s+(\w+)(?:.*?As\s+(\w+))?/i.exec(trimmed);
        if (constMatch) {
            const name = constMatch[1];
            const type = constMatch[2] || 'Object';

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
        // Regex: (Modifier) (Name) [As Type]
        const fieldMatch = /^\s*(Public|Private|Friend|Protected)\s+(\w+)(?:.*?As\s+(\w+))?/i.exec(trimmed);
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
