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

    // 1. Blocks (Sub, Function, Class, Module)
    extractSymbols(text, PARSER_BLOCK_REGEX, (m) => {
        const type = m[2]; // Sub, Function, Class, Module
        const name = m[3];
        let kind: SymbolKind = SymbolKind.Function;
        if (type === 'Sub') kind = SymbolKind.Method;
        if (type === 'Class') kind = SymbolKind.Class;
        if (type === 'Module') kind = SymbolKind.Module;
        if (type === 'Property') kind = SymbolKind.Property;
        return { name, kind, detail: type };
    }, document, symbols);

    // 2. Dim Variables
    extractSymbols(text, PARSER_DIM_REGEX, (m) => {
        const name = m[1];
        const type = m[2] || 'Object';
        return { name, kind: SymbolKind.Variable, detail: `Dim ${name} As ${type}` };
    }, document, symbols);

    // 3. Constants
    extractSymbols(text, PARSER_CONST_REGEX, (m) => {
        const name = m[2];
        const type = m[3] || 'Object';
        return { name, kind: SymbolKind.Constant, detail: `Const ${name} As ${type}` };
    }, document, symbols);

    // 4. Fields (Module/Class level variables)
    extractSymbols(text, PARSER_FIELD_REGEX, (m) => {
        const modifier = m[1];
        const name = m[2];
        // Safety check to avoid keywords being picked up as fields if regex is too loose
        if (/^(Sub|Function|Class|Module|Const|Property)$/i.test(name)) return null;

        const type = m[3] || 'Object';
        return { name, kind: SymbolKind.Field, detail: `${modifier} ${name} As ${type}` };
    }, document, symbols);

    return symbols;
}

function extractSymbols(
    text: string,
    regex: RegExp,
    extractor: (match: RegExpExecArray) => { name: string, kind: SymbolKind, detail: string } | null,
    document: TextDocument,
    symbols: DocumentSymbol[]
) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
        const result = extractor(m);
        if (result) {
            symbols.push(createSymbol(result.name, result.kind, result.detail, m, document));
        }
    }
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
