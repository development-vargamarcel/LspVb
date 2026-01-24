import { FoldingRange, FoldingRangeParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import {
    FOLD_BLOCK_END_REGEX,
    FOLD_NEXT_REGEX,
    FOLD_WEND_REGEX,
    FOLD_LOOP_REGEX,
    FOLD_BLOCK_START_REGEX,
    FOLD_IF_START_REGEX,
    FOLD_FOR_START_REGEX,
    FOLD_WHILE_START_REGEX,
    FOLD_DO_START_REGEX
} from '../utils/regexes';

/**
 * Handles folding range requests.
 * Identifies collapsible blocks (Sub, Function, If, For, etc.) in the document.
 *
 * @param params The folding range parameters.
 * @param document The text document.
 * @returns An array of FoldingRanges.
 */
export function onFoldingRanges(
    params: FoldingRangeParams,
    document: TextDocument
): FoldingRange[] {
    Logger.log('Folding ranges requested for ' + document.uri);
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const ranges: FoldingRange[] = [];
    const stack: { line: number; type: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
        // Remove comments for analysis
        const rawLine = lines[i];
        const line = rawLine.split("'")[0].trim();
        if (!line) continue;

        // Check for block ends
        let endMatch = false;
        if (FOLD_BLOCK_END_REGEX.test(line)) endMatch = true;
        else if (FOLD_NEXT_REGEX.test(line)) endMatch = true;
        else if (FOLD_WEND_REGEX.test(line)) endMatch = true;
        else if (FOLD_LOOP_REGEX.test(line)) endMatch = true;

        if (endMatch) {
            if (stack.length > 0) {
                const start = stack.pop();
                if (start) {
                    // Fold from start line to current line - 1
                    // (Keep the End line visible)
                    ranges.push({
                        startLine: start.line,
                        endLine: i - 1
                    });
                }
            }
            // End line cannot be a start line (unless mixed, which is bad style)
            continue;
        }

        // Check for block starts
        let startType: string | null = null;

        if (FOLD_BLOCK_START_REGEX.test(line)) {
            startType = 'block';
        } else if (FOLD_IF_START_REGEX.test(line)) {
            // Block If check: If ... Then (and nothing else on line)
            startType = 'if';
        } else if (FOLD_FOR_START_REGEX.test(line)) {
            startType = 'for';
        } else if (FOLD_WHILE_START_REGEX.test(line)) {
            startType = 'while';
        } else if (FOLD_DO_START_REGEX.test(line)) {
            startType = 'do';
        }

        if (startType) {
            stack.push({ line: i, type: startType });
        }
    }

    return ranges;
}
