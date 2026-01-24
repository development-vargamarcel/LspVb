import {
    CodeLens,
    CodeLensParams,
    SymbolKind,
    DocumentSymbol
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { parseDocumentSymbols } from '../utils/parser';
import { onReferences } from './references';

/**
 * Handles Code Lens requests.
 * Generates code lenses for major symbols (Classes, Methods, etc.) to show reference counts.
 *
 * @param params The code lens parameters.
 * @param document The text document.
 * @returns An array of CodeLens objects.
 */
export function onCodeLens(params: CodeLensParams, document: TextDocument): CodeLens[] {
    Logger.log(`CodeLens requested for ${document.uri}`);
    const symbols = parseDocumentSymbols(document);
    const lenses: CodeLens[] = [];

    // Helper to traverse
    function traverse(syms: DocumentSymbol[]) {
        for (const sym of syms) {
            if (shouldShowCodeLens(sym.kind)) {
                lenses.push({
                    range: sym.selectionRange,
                    data: {
                        uri: document.uri,
                        position: sym.selectionRange.start
                    }
                });
            }
            if (sym.children) {
                traverse(sym.children);
            }
        }
    }

    traverse(symbols);
    Logger.debug(`CodeLens: Generated ${lenses.length} lenses.`);
    return lenses;
}

/**
 * Resolves a Code Lens by calculating the number of references.
 *
 * @param codeLens The code lens to resolve.
 * @param document The text document.
 * @returns The resolved CodeLens with a command.
 */
export function onCodeLensResolve(codeLens: CodeLens, document: TextDocument): CodeLens {
    const data = codeLens.data;
    if (!data) return codeLens;

    Logger.debug(
        `CodeLensResolve: Resolving for ${data.uri} at ${data.position.line}:${data.position.character}`
    );

    // Calculate references
    // includeDeclaration: false so we only count usages
    const locations = onReferences(
        {
            textDocument: { uri: data.uri },
            position: data.position,
            context: { includeDeclaration: false }
        },
        document
    );

    const count = locations.length;
    const title = count === 1 ? '1 reference' : `${count} references`;

    // The command 'editor.action.showReferences' is a standard VS Code command.
    // Arguments: [uri, position, locations]
    // Note: The position argument for showReferences is the position of the symbol being searched for (where to show the peek window).
    codeLens.command = {
        title: title,
        command: 'editor.action.showReferences',
        arguments: [data.uri, data.position, locations]
    };

    return codeLens;
}

/**
 * Determines if a symbol kind should have a Code Lens.
 * @param kind The symbol kind.
 * @returns True if it should show a code lens.
 */
function shouldShowCodeLens(kind: SymbolKind): boolean {
    return (
        kind === SymbolKind.Function ||
        kind === SymbolKind.Method ||
        kind === SymbolKind.Class ||
        kind === SymbolKind.Module ||
        kind === SymbolKind.Property ||
        kind === SymbolKind.Interface ||
        kind === SymbolKind.Enum ||
        kind === SymbolKind.Struct
    );
}
