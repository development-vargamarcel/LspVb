import { Hover, HoverParams, MarkupKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { KEYWORDS } from '../keywords';
import { parseDocumentSymbols } from '../utils/parser';

export function onHover(params: HoverParams, document: TextDocument): Hover | null {
    const position = params.position;
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Identify word boundaries
    let start = offset;
    while (start > 0 && /[\w]/.test(text.charAt(start - 1))) {
        start--;
    }

    let end = offset;
    while (end < text.length && /[\w]/.test(text.charAt(end))) {
        end++;
    }

    if (start === end) {
        return null;
    }

    const word = text.substring(start, end);
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
    // (This is simple: if multiple exist, it takes the first one.
    // Ideally check scope or if position is inside usage vs definition)
    const matchedSymbol = symbols.find(s => s.name.toLowerCase() === lowerWord);

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
