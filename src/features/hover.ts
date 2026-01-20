import { Hover, HoverParams, MarkupKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { KEYWORDS } from '../keywords';
import { parseDocumentSymbols } from '../utils/parser';
import { getWordAtPosition } from '../utils/textUtils';

export function onHover(params: HoverParams, document: TextDocument): Hover | null {
    const word = getWordAtPosition(document, params.position);
    if (!word) {
        return null;
    }

    const lowerWord = word.toLowerCase();

    // 1. Check Keywords
    const keywordData = KEYWORDS[lowerWord];
    if (keywordData) {
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: `**${keywordData.detail}**\n\n${keywordData.documentation}`
            }
        };
    }

    // 2. Check User Symbols
    const symbols = parseDocumentSymbols(document);
    // Find the symbol that matches the name
    const matchedSymbol = findSymbolRecursive(symbols, lowerWord);

    if (matchedSymbol) {
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: `**${matchedSymbol.name}**\n\n${matchedSymbol.detail}`
            }
        };
    }

    return null;
}

function findSymbolRecursive(symbols: any[], name: string): any | null {
    for (const sym of symbols) {
        if (sym.name.toLowerCase() === name) {
            return sym;
        }
        if (sym.children) {
            const childMatch = findSymbolRecursive(sym.children, name);
            if (childMatch) return childMatch;
        }
    }
    return null;
}
