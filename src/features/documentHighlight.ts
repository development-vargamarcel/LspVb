import {
    DocumentHighlight,
    DocumentHighlightKind,
    DocumentHighlightParams,
    SymbolKind,
    Range
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { onReferences } from './references';
import { parseDocumentSymbols, findSymbolAtPosition } from '../utils/parser';
import { stripComment } from '../utils/textUtils';

/**
 * Handles Document Highlight requests.
 * Highlights all occurrences of the symbol under the cursor.
 * Uses `onReferences` logic.
 *
 * @param params The document highlight parameters.
 * @param document The text document.
 * @returns An array of DocumentHighlight objects.
 */
export function onDocumentHighlight(
    params: DocumentHighlightParams,
    document: TextDocument
): DocumentHighlight[] {
    Logger.log(
        `Document Highlight requested at ${params.position.line}:${params.position.character}`
    );

    // Reuse scope-aware logic from onReferences
    // onReferences returns Location[] { uri, range }
    // We just need to map it to DocumentHighlight

    const locations = onReferences(
        {
            textDocument: params.textDocument,
            position: params.position,
            context: { includeDeclaration: true }
        },
        document
    );

    const highlights: DocumentHighlight[] = locations.map((loc) => ({
        range: loc.range,
        kind: DocumentHighlightKind.Text // Default to Text since we don't distinguish Read/Write yet
    }));

    // Enhancement: If we are on a Method/Function/Property definition,
    // highlight control flow keywords (Exit, Return, End)
    const symbols = parseDocumentSymbols(document);
    const symbol = findSymbolAtPosition(symbols, '', params.position); // name arg ignored? findSymbolAtPosition uses name?
    // Wait, findSymbolAtPosition takes 'name'.
    // We need to find the symbol at the position regardless of name?
    // onReferences already found the symbol name.
    // But we want the definition symbol object.

    // We can use getSymbolContainingPosition, but that finds the container.
    // If we are on the definition line, getSymbolContainingPosition returns the PARENT.
    // But findSymbolAtPosition iterates and checks ranges.

    // Let's use getSymbolContainingPosition first.
    // Actually, onReferences finds symbols based on word.

    // Let's iterate symbols to find if one's SELECTION range contains position.
    // Or just use the word from references?

    // We can just scan symbols again.

    function findDefinitionSymbol(syms: any[]): any {
        for(const s of syms) {
            if (isPositionInRange(params.position, s.selectionRange)) {
                return s;
            }
            if (s.children) {
                const found = findDefinitionSymbol(s.children);
                if (found) return found;
            }
        }
        return null;
    }

    const defSymbol = findDefinitionSymbol(symbols);

    if (defSymbol && (
        defSymbol.kind === SymbolKind.Method ||
        defSymbol.kind === SymbolKind.Function ||
        defSymbol.kind === SymbolKind.Property ||
        defSymbol.kind === SymbolKind.Constructor
    )) {
        // Scan the body of the function for control flow keywords
        const text = document.getText();
        const lines = text.split(/\r?\n/);

        const startLine = defSymbol.range.start.line;
        const endLine = defSymbol.range.end.line;

        for (let i = startLine; i <= endLine; i++) {
            const rawLine = lines[i];
            const trimmed = stripComment(rawLine).trim();

            // Match Exit <Type>
            const exitRegex = /^(Exit)\s+(Sub|Function|Property)/i;
            const exitMatch = exitRegex.exec(trimmed);
            if (exitMatch) {
                const index = rawLine.indexOf(exitMatch[1]); // "Exit"
                if (index !== -1) {
                    highlights.push({
                        range: Range.create(i, index, i, index + exitMatch[1].length), // Highlight "Exit"
                        kind: DocumentHighlightKind.Read
                    });
                }
            }

            // Match Return
            if (/^Return\b/i.test(trimmed)) {
                const index = rawLine.indexOf("Return"); // Case sensitive search? rawLine might match "Return" or "return"
                // Use regex exec to find index ignoring case
                const returnMatch = /Return/i.exec(rawLine);
                if (returnMatch) {
                    highlights.push({
                        range: Range.create(i, returnMatch.index, i, returnMatch.index + 6),
                        kind: DocumentHighlightKind.Read
                    });
                }
            }

            // Match End <Type> (Highlight "End Sub" etc)
            if (i === endLine) {
                // Usually the last line.
                // Or scan for it.
                const endRegex = /^(End)\s+(Sub|Function|Property)/i;
                const endMatch = endRegex.exec(trimmed);
                if (endMatch) {
                     const index = rawLine.indexOf(endMatch[1]); // "End"
                     if (index !== -1) {
                         highlights.push({
                             range: Range.create(i, index, i, index + endMatch[0].length), // Highlight "End Sub"
                             kind: DocumentHighlightKind.Read
                         });
                     }
                }
            }
        }
    }

    Logger.debug(`Document Highlight: Found ${highlights.length} highlights.`);
    return highlights;
}

function isPositionInRange(pos: any, range: any): boolean {
    if (pos.line < range.start.line || pos.line > range.end.line) return false;
    if (pos.line === range.start.line && pos.character < range.start.character) return false;
    if (pos.line === range.end.line && pos.character > range.end.character) return false;
    return true;
}
