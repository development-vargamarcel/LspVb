import { Hover, HoverParams, MarkupKind, SymbolKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { KEYWORDS } from '../keywords';
import { BUILTINS } from '../builtins';
import { parseDocumentSymbols, findSymbolAtPosition } from '../utils/parser';
import { getWordAtPosition } from '../utils/textUtils';

/**
 * Handles hover requests.
 * Displays information about the symbol under the cursor (keywords or user-defined symbols).
 *
 * @param params The hover parameters (position).
 * @param document The text document.
 * @returns A Hover object with markdown content, or null if no info found.
 */
export function onHover(params: HoverParams, document: TextDocument): Hover | null {
    Logger.log(`Hover requested at ${params.position.line}:${params.position.character}`);
    const word = getWordAtPosition(document, params.position);
    if (!word) {
        Logger.debug('Hover: No word found at position.');
        return null;
    }

    const lowerWord = word.toLowerCase();

    // 1. Check Keywords
    const keywordData = KEYWORDS[lowerWord];
    if (keywordData) {
        Logger.debug(`Hover: Found keyword '${lowerWord}'.`);
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: `**${keywordData.detail}**\n\n${keywordData.documentation}`
            }
        };
    }

    // 2. Check Built-ins
    const builtinData = BUILTINS[lowerWord];
    if (builtinData) {
        Logger.debug(`Hover: Found builtin '${lowerWord}'.`);
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: `**${builtinData.detail}**\n\n${builtinData.documentation}`
            }
        };
    }

    // 3. Check User Symbols
    const symbols = parseDocumentSymbols(document);
    // Find the symbol that matches the name
    const matchedSymbol = findSymbolAtPosition(symbols, lowerWord, params.position);

    if (matchedSymbol) {
        Logger.debug(`Hover: Found user symbol '${matchedSymbol.name}'.`);
        const kindName = getKindName(matchedSymbol.kind);
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: `**${matchedSymbol.name}** (${kindName})\n\n${matchedSymbol.detail}`
            }
        };
    }

    Logger.debug('Hover: No info found.');
    return null;
}

/**
 * Converts a SymbolKind enum to a human-readable string.
 *
 * @param kind The SymbolKind.
 * @returns The string representation.
 */
function getKindName(kind: SymbolKind): string {
    switch (kind) {
        case SymbolKind.File:
            return 'File';
        case SymbolKind.Module:
            return 'Module';
        case SymbolKind.Namespace:
            return 'Namespace';
        case SymbolKind.Package:
            return 'Package';
        case SymbolKind.Class:
            return 'Class';
        case SymbolKind.Method:
            return 'Method';
        case SymbolKind.Property:
            return 'Property';
        case SymbolKind.Field:
            return 'Field';
        case SymbolKind.Constructor:
            return 'Constructor';
        case SymbolKind.Enum:
            return 'Enum';
        case SymbolKind.Interface:
            return 'Interface';
        case SymbolKind.Function:
            return 'Function';
        case SymbolKind.Variable:
            return 'Variable';
        case SymbolKind.Constant:
            return 'Constant';
        case SymbolKind.String:
            return 'String';
        case SymbolKind.Number:
            return 'Number';
        case SymbolKind.Boolean:
            return 'Boolean';
        case SymbolKind.Array:
            return 'Array';
        case SymbolKind.Object:
            return 'Object';
        case SymbolKind.Key:
            return 'Key';
        case SymbolKind.Null:
            return 'Null';
        case SymbolKind.EnumMember:
            return 'EnumMember';
        case SymbolKind.Struct:
            return 'Struct';
        case SymbolKind.Event:
            return 'Event';
        case SymbolKind.Operator:
            return 'Operator';
        case SymbolKind.TypeParameter:
            return 'TypeParameter';
        default:
            return 'Symbol';
    }
}
