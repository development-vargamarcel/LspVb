import {
    SemanticTokensParams,
    SemanticTokens,
    SemanticTokensBuilder,
    SymbolKind,
    DocumentSymbol
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols } from '../utils/parser';

export const tokenTypes = [
    'namespace',
    'type',
    'class',
    'enum',
    'interface',
    'struct',
    'typeParameter',
    'parameter',
    'variable',
    'property',
    'enumMember',
    'event',
    'function',
    'method',
    'macro',
    'keyword',
    'modifier',
    'comment',
    'string',
    'number',
    'regexp',
    'operator'
];

export const tokenModifiers = [
    'declaration',
    'definition',
    'readonly',
    'static',
    'deprecated',
    'abstract',
    'async',
    'modification',
    'documentation',
    'defaultLibrary'
];

const tokenTypesMap = new Map<string, number>();
tokenTypes.forEach((type, index) => tokenTypesMap.set(type, index));

const tokenModifiersMap = new Map<string, number>();
tokenModifiers.forEach((modifier, index) => tokenModifiersMap.set(modifier, index));

/**
 * Handles semantic tokens requests.
 * Computes semantic tokens for the document to support syntax highlighting.
 *
 * @param params The semantic tokens parameters.
 * @param document The text document.
 * @returns A SemanticTokens object containing the encoded tokens.
 */
export function onSemanticTokens(
    params: SemanticTokensParams,
    document: TextDocument
): SemanticTokens {
    const builder = new SemanticTokensBuilder();
    const symbols = parseDocumentSymbols(document);

    traverseSymbols(builder, symbols);

    return builder.build();
}

function traverseSymbols(builder: SemanticTokensBuilder, symbols: DocumentSymbol[]) {
    for (const symbol of symbols) {
        const typeIndex = getTokenTypeIndex(symbol.kind);
        if (typeIndex !== -1) {
            builder.push(
                symbol.selectionRange.start.line,
                symbol.selectionRange.start.character,
                symbol.selectionRange.end.character - symbol.selectionRange.start.character,
                typeIndex,
                0 // Modifiers could be improved based on detail/modifiers
            );
        }

        if (symbol.children) {
            traverseSymbols(builder, symbol.children);
        }
    }
}

function getTokenTypeIndex(kind: SymbolKind): number {
    let type = '';
    switch (kind) {
        case SymbolKind.Namespace:
            type = 'namespace';
            break;
        case SymbolKind.Class:
            type = 'class';
            break;
        case SymbolKind.Enum:
            type = 'enum';
            break;
        case SymbolKind.Interface:
            type = 'interface';
            break;
        case SymbolKind.Struct:
            type = 'struct';
            break;
        case SymbolKind.TypeParameter:
            type = 'typeParameter';
            break;
        case SymbolKind.Variable:
            type = 'variable';
            break;
        case SymbolKind.Constant:
            type = 'variable';
            break;
        case SymbolKind.String:
            type = 'string';
            break;
        case SymbolKind.Number:
            type = 'number';
            break;
        case SymbolKind.Boolean:
            type = 'keyword';
            break;
        case SymbolKind.Array:
            type = 'variable';
            break;
        case SymbolKind.Object:
            type = 'variable';
            break;
        case SymbolKind.Key:
            type = 'keyword';
            break;
        case SymbolKind.Null:
            type = 'keyword';
            break;
        case SymbolKind.EnumMember:
            type = 'enumMember';
            break;
        case SymbolKind.Event:
            type = 'event';
            break;
        case SymbolKind.Operator:
            type = 'operator';
            break;
        case SymbolKind.Method:
            type = 'method';
            break;
        case SymbolKind.Property:
            type = 'property';
            break;
        case SymbolKind.Field:
            type = 'property';
            break;
        case SymbolKind.Constructor:
            type = 'method';
            break;
        case SymbolKind.Function:
            type = 'function';
            break;
        case SymbolKind.Module:
            type = 'namespace';
            break;
        default:
            return -1;
    }
    return tokenTypesMap.get(type) ?? -1;
}
