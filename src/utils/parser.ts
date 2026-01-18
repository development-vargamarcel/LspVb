import { DocumentSymbol, SymbolKind, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

export interface MySymbol {
    name: string;
    kind: SymbolKind;
    range: Range;
    selectionRange: Range;
    detail: string;
}

/**
 * Parses the document to extract symbols (variables, functions, subs, classes).
 */
export function parseDocumentSymbols(document: TextDocument): MySymbol[] {
    const text = document.getText();
    const symbols: MySymbol[] = [];

    // Regex for Sub, Function, Class, Module
    // Matches: [Public|Private] Sub|Function|Class|Module Name
    const blockRegex = /^\s*(?:(Public|Private|Friend|Protected)\s+)?(Sub|Function|Class|Module)\s+(\w+)/gm;
    let m: RegExpExecArray | null;

    while ((m = blockRegex.exec(text))) {
        const type = m[2]; // Sub, Function, Class, Module
        const name = m[3];

        let kind: SymbolKind = SymbolKind.Function;
        if (type === 'Sub') kind = SymbolKind.Method;
        if (type === 'Class') kind = SymbolKind.Class;
        if (type === 'Module') kind = SymbolKind.Module;

        const range = {
            start: document.positionAt(m.index),
            end: document.positionAt(m.index + m[0].length)
        };
        const selectionRange = {
            start: document.positionAt(m.index + m[0].lastIndexOf(name)),
            end: document.positionAt(m.index + m[0].lastIndexOf(name) + name.length)
        };

        symbols.push({
            name: name,
            kind: kind,
            range: range,
            selectionRange: selectionRange,
            detail: type
        });
    }

    // Variable Regex:
    // 1. Dim Name
    const dimRegex = /^\s*Dim\s+(\w+)(?:\s+As\s+(\w+))?/gmi;
    while ((m = dimRegex.exec(text))) {
        const name = m[1];
        const type = m[2] || 'Object';
        symbols.push({
            name: name,
            kind: SymbolKind.Variable,
            range: {
                start: document.positionAt(m.index),
                end: document.positionAt(m.index + m[0].length)
            },
            selectionRange: {
                start: document.positionAt(m.index + m[0].indexOf(name)),
                end: document.positionAt(m.index + m[0].indexOf(name) + name.length)
            },
            detail: `Dim ${name} As ${type}`
        });
    }

    // 2. Const Name
    const constRegex = /^\s*(?:(Public|Private)\s+)?Const\s+(\w+)(?:\s+As\s+(\w+))?/gmi;
    while ((m = constRegex.exec(text))) {
        const name = m[2];
        const type = m[3] || 'Object';
        symbols.push({
            name: name,
            kind: SymbolKind.Constant,
            range: {
                start: document.positionAt(m.index),
                end: document.positionAt(m.index + m[0].length)
            },
            selectionRange: {
                start: document.positionAt(m.index + m[0].indexOf(name)),
                end: document.positionAt(m.index + m[0].indexOf(name) + name.length)
            },
            detail: `Const ${name} As ${type}`
        });
    }

    // 3. Module Level Variables (Private/Public x As Type) - excluding Sub/Function/Const
    // This is tricky with regex.
    // Matches: Private x As Integer
    // But NOT: Private Sub ...
    const fieldRegex = /^\s*(Public|Private|Friend|Protected)\s+(\w+)(?:\s+As\s+(\w+))?/gm;
    while ((m = fieldRegex.exec(text))) {
        const modifier = m[1];
        const name = m[2];
        // Ensure name is not a keyword for block start
        if (/^(Sub|Function|Class|Module|Const|Property)$/i.test(name)) continue;

        const type = m[3] || 'Object';
        symbols.push({
            name: name,
            kind: SymbolKind.Field,
            range: {
                start: document.positionAt(m.index),
                end: document.positionAt(m.index + m[0].length)
            },
            selectionRange: {
                start: document.positionAt(m.index + m[0].indexOf(name)),
                end: document.positionAt(m.index + m[0].indexOf(name) + name.length)
            },
            detail: `${modifier} ${name} As ${type}`
        });
    }

    return symbols;
}
