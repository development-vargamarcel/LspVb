import { DocumentSymbol, SymbolKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    PARSER_BLOCK_REGEX,
    PARSER_DIM_REGEX,
    PARSER_CONST_REGEX,
    PARSER_FIELD_REGEX
} from './regexes';

/**
 * Parses the document to extract symbols (variables, functions, subs, classes).
 */
export function parseDocumentSymbols(document: TextDocument): DocumentSymbol[] {
    const text = document.getText();
    const symbols: DocumentSymbol[] = [];
    let m: RegExpExecArray | null;

    // 1. Blocks (Sub, Function, Class, Module)
    PARSER_BLOCK_REGEX.lastIndex = 0;
    while ((m = PARSER_BLOCK_REGEX.exec(text))) {
        // m[1] is modifier (optional)
        const type = m[2]; // Sub, Function, Class, Module
        const name = m[3];

        let kind: SymbolKind = SymbolKind.Function;
        if (type === 'Sub') kind = SymbolKind.Method;
        if (type === 'Class') kind = SymbolKind.Class;
        if (type === 'Module') kind = SymbolKind.Module;
        if (type === 'Property') kind = SymbolKind.Property;

        symbols.push(createSymbol(name, kind, type, m, document));
    }

    // 2. Dim Variables
    PARSER_DIM_REGEX.lastIndex = 0;
    while ((m = PARSER_DIM_REGEX.exec(text))) {
        const name = m[1];
        const type = m[2] || 'Object';
        symbols.push(createSymbol(name, SymbolKind.Variable, `Dim ${name} As ${type}`, m, document));
    }

    // 3. Constants
    PARSER_CONST_REGEX.lastIndex = 0;
    while ((m = PARSER_CONST_REGEX.exec(text))) {
        // m[1] is modifier
        const name = m[2];
        const type = m[3] || 'Object';
        symbols.push(createSymbol(name, SymbolKind.Constant, `Const ${name} As ${type}`, m, document));
    }

    // 4. Fields (Module/Class level variables)
    PARSER_FIELD_REGEX.lastIndex = 0;
    while ((m = PARSER_FIELD_REGEX.exec(text))) {
        const modifier = m[1];
        const name = m[2];

        // Safety check to avoid keywords being picked up as fields if regex is too loose
        if (/^(Sub|Function|Class|Module|Const|Property)$/i.test(name)) continue;

        const type = m[3] || 'Object';
        symbols.push(createSymbol(name, SymbolKind.Field, `${modifier} ${name} As ${type}`, m, document));
    }

    return symbols;
}

function createSymbol(name: string, kind: SymbolKind, detail: string, match: RegExpExecArray, document: TextDocument): DocumentSymbol {
    const matchStr = match[0];
    const index = match.index;
    const nameIndex = matchStr.indexOf(name); // naive finding of name in match string

    return {
        name: name,
        kind: kind,
        range: {
            start: document.positionAt(index),
            end: document.positionAt(index + matchStr.length)
        },
        selectionRange: {
            start: document.positionAt(index + nameIndex),
            end: document.positionAt(index + nameIndex + name.length)
        },
        detail: detail,
        children: []
    };
}
