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
    FOLD_DO_START_REGEX,
    FOLD_SELECT_START_REGEX,
    FOLD_REGION_START_REGEX,
    FOLD_REGION_END_REGEX,
    FOLD_IMPORTS_REGEX
} from '../utils/regexes';
import { stripComment } from '../utils/textUtils';

/**
 * Handles folding range requests.
 * Identifies collapsible blocks (Sub, Function, If, For, etc.) and Imports sections.
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

    Logger.debug(`Folding: Analyzing ${lines.length} lines.`);
    const ranges: FoldingRange[] = [];
    const stack: { line: number; type: string }[] = [];

    let commentBlockStart = -1;
    let importsBlockStart = -1;

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmedRaw = rawLine.trim();

        // 1. Comment Folding Logic
        if (trimmedRaw.startsWith("'")) {
            if (commentBlockStart === -1) {
                commentBlockStart = i;
            }
        } else {
            if (commentBlockStart !== -1) {
                // End of comment block
                const commentBlockEnd = i - 1;
                // Only fold if >= 2 lines
                if (commentBlockEnd > commentBlockStart) {
                    ranges.push({
                        startLine: commentBlockStart,
                        endLine: commentBlockEnd,
                        kind: 'comment'
                    });
                }
                commentBlockStart = -1;
            }
        }

        // 2. Imports Folding Logic
        // Check if line is an Imports statement
        if (FOLD_IMPORTS_REGEX.test(trimmedRaw)) {
            if (importsBlockStart === -1) {
                importsBlockStart = i;
            }
        } else {
            if (importsBlockStart !== -1) {
                // End of imports block
                const importsBlockEnd = i - 1;
                // Only fold if >= 2 lines
                if (importsBlockEnd > importsBlockStart) {
                    ranges.push({
                        startLine: importsBlockStart,
                        endLine: importsBlockEnd,
                        kind: 'imports'
                    });
                }
                importsBlockStart = -1;
            }
        }

        // Remove comments for analysis of code blocks
        const line = stripComment(rawLine).trim();
        if (!line) continue;

        // Check for block ends
        let endMatch = false;
        if (FOLD_BLOCK_END_REGEX.test(line)) endMatch = true;
        else if (FOLD_NEXT_REGEX.test(line)) endMatch = true;
        else if (FOLD_WEND_REGEX.test(line)) endMatch = true;
        else if (FOLD_LOOP_REGEX.test(line)) endMatch = true;
        else if (FOLD_REGION_END_REGEX.test(line)) endMatch = true;

        if (endMatch) {
            if (stack.length > 0) {
                // Find nearest matching block type? Or just pop?
                // Simple stack popping for now.
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
        } else if (FOLD_SELECT_START_REGEX.test(line)) {
            startType = 'select';
        } else if (FOLD_REGION_START_REGEX.test(line)) {
            startType = 'region';
        }

        if (startType) {
            stack.push({ line: i, type: startType });
        }
    }

    // Close any remaining comment block at EOF
    if (commentBlockStart !== -1) {
        const commentBlockEnd = lines.length - 1;
        if (commentBlockEnd > commentBlockStart) {
            ranges.push({
                startLine: commentBlockStart,
                endLine: commentBlockEnd,
                kind: 'comment'
            });
        }
    }

    // Close any remaining imports block at EOF
    if (importsBlockStart !== -1) {
        const importsBlockEnd = lines.length - 1;
        if (importsBlockEnd > importsBlockStart) {
            ranges.push({
                startLine: importsBlockStart,
                endLine: importsBlockEnd,
                kind: 'imports'
            });
        }
    }

    Logger.debug(`Folding: Found ${ranges.length} folding ranges.`);
    return ranges;
}
