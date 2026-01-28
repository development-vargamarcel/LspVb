import {
    SelectionRange,
    SelectionRangeParams,
    DocumentSymbol,
    Range,
    Position
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocumentSymbols } from '../utils/parser';
import { Logger } from '../utils/logger';

/**
 * Handles selection range requests.
 * Computes a hierarchy of selection ranges for the given positions.
 * This allows the user to expand selection from word -> line -> block -> parent block.
 *
 * @param params The selection range parameters.
 * @param document The text document.
 * @returns An array of SelectionRange objects (one for each requested position).
 */
export function onSelectionRanges(
    params: SelectionRangeParams,
    document: TextDocument
): SelectionRange[] {
    const result: SelectionRange[] = [];
    Logger.log(
        `Selection Range requested for ${params.textDocument.uri} at ${params.positions.length} positions.`
    );

    const symbols = parseDocumentSymbols(document);

    for (const position of params.positions) {
        // Find the hierarchy for this position
        // We start from the deepest symbol and go up to the root
        const chain = getSymbolChain(symbols, position);

        // If no symbol found, we can at least return the word range?
        // Or the line range?
        // VS Code client handles word selection by default if we don't return anything?
        // Actually, we should return a hierarchy.
        // Even if no symbol, we can return: Line -> Document.

        // Always start with the word under cursor if possible, or just the cursor pos?
        // The LSP spec says "start with the range that contains the position".
        // Usually: Word -> Line -> Block (Symbol) -> Parent Block -> ... -> Document

        // Let's build the ranges from Outer (Document) to Inner.
        // Then link them: Inner.parent = Outer.

        // 1. Document Range
        let currentRange: SelectionRange = {
            range: Range.create(0, 0, document.lineCount, 0)
        };

        // 2. Add Symbol Chain (from root down to leaf)
        // 'chain' returned by getSymbolChain is [Root, Child, Grandchild...]
        for (const sym of chain) {
            // Add Symbol Range (the whole block)
            const symRange: SelectionRange = {
                range: sym.range,
                parent: currentRange
            };
            currentRange = symRange;

            // Should we add selectionRange (the definition name) as an intermediate step?
            // Usually selectionRange is smaller than range.
            // If the cursor is ON the definition name, expanding selection should go:
            // Word (Name) -> Definition Line? -> Whole Block.

            // For now, let's stick to the block range.
        }

        // 3. Leaf level refinement (e.g. Line, Word)
        // If we are deep inside a block, 'currentRange' is the block.
        // We want to add ranges inside that block if possible?
        // But parseDocumentSymbols only gives us blocks and variables.
        // If we are inside a method body (code), we don't have symbols for statements.
        // So we should add: Line -> Word.

        // Add Line Range
        const lineRange: SelectionRange = {
            range: Range.create(position.line, 0, position.line + 1, 0),
            parent: currentRange
        };

        // Check if line range is strictly contained in currentRange (it should be if inside a block)
        // If lineRange is larger (e.g. we are at root and document is 1 line), handle gracefully.
        // Assuming strict containment.
        if (contains(currentRange.range, lineRange.range)) {
            currentRange = lineRange;
        }

        // Add Word Range (if on a word)
        const wordRange = getWordRangeAtPosition(document, position);
        if (wordRange && contains(currentRange.range, wordRange)) {
            currentRange = {
                range: wordRange,
                parent: currentRange
            };
        }

        result.push(currentRange);
    }

    return result;
}

/**
 * Helper to check if range A contains range B.
 */
function contains(a: Range, b: Range): boolean {
    if (b.start.line < a.start.line || b.end.line > a.end.line) return false;
    if (b.start.line === a.start.line && b.start.character < a.start.character) return false;
    if (b.end.line === a.end.line && b.end.character > a.end.character) return false;
    return true;
}

/**
 * Returns the chain of symbols containing the position, from Root to Leaf.
 */
function getSymbolChain(symbols: DocumentSymbol[], position: Position): DocumentSymbol[] {
    const chain: DocumentSymbol[] = [];
    let currentScope = symbols;

    while (true) {
        let found = false;
        for (const sym of currentScope) {
            if (isPositionInRange(position, sym.range)) {
                chain.push(sym);
                if (sym.children && sym.children.length > 0) {
                    currentScope = sym.children;
                    found = true;
                }
                break;
            }
        }
        if (!found) break;
    }
    return chain;
}

/**
 * Checks if a position is within a given range.
 */
function isPositionInRange(pos: Position, range: Range): boolean {
    if (pos.line < range.start.line || pos.line > range.end.line) return false;
    if (pos.line === range.start.line && pos.character < range.start.character) return false;
    if (pos.line === range.end.line && pos.character > range.end.character) return false;
    return true;
}

/**
 * Gets the range of the word at the given position.
 */
function getWordRangeAtPosition(document: TextDocument, position: Position): Range | null {
    const text = document.getText(Range.create(position.line, 0, position.line + 1, 0));
    // text is the line content (including newline?)
    // regex to find word at character
    const lineText = text; // document.getText returns string
    const offset = position.character;

    // Find start of word
    let start = offset;
    while (start > 0 && /\w/.test(lineText[start - 1])) {
        start--;
    }

    // Find end of word
    let end = offset;
    while (end < lineText.length && /\w/.test(lineText[end])) {
        end++;
    }

    if (start === end) return null;

    return Range.create(position.line, start, position.line, end);
}
