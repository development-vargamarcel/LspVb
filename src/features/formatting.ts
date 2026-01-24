import { TextDocument, TextEdit, FormattingOptions, Range } from 'vscode-languageserver/node';
import { Logger } from '../utils/logger';
import { formatLine, formatKeywordCasing } from '../utils/textUtils';
import {
    VAL_BLOCK_START_REGEX,
    VAL_FOR_START_REGEX,
    VAL_DO_START_REGEX,
    VAL_SELECT_CASE_START_REGEX,
    VAL_WHILE_START_REGEX,
    VAL_BLOCK_END_REGEX,
    VAL_NEXT_REGEX,
    VAL_LOOP_REGEX,
    VAL_WEND_REGEX,
    FMT_IF_THEN_START_REGEX,
    FMT_ELSE_REGEX,
    FMT_CASE_REGEX
} from '../utils/regexes';

/**
 * Handles document formatting requests.
 * Applies indentation rules and keyword casing/spacing.
 *
 * @param document The document to format.
 * @param options Formatting options (tab size, insert spaces).
 * @returns An array of TextEdits to apply the formatting.
 */
export function formatDocument(document: TextDocument, options: FormattingOptions): TextEdit[] {
    Logger.log('Formatting requested for ' + document.uri);
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const edits: TextEdit[] = [];

    Logger.debug(`Formatting: Processing ${lines.length} lines.`);

    let indentLevel = 0;
    const indentString = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    const selectStack: boolean[] = []; // true = case opened

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let trimmed = line.trim();

        // Apply keyword casing formatting
        trimmed = formatKeywordCasing(trimmed);

        // Apply spacing formatting
        trimmed = formatLine(trimmed);

        if (trimmed === '') {
            if (line.length > 0) {
                edits.push({
                    range: Range.create(i, 0, i, line.length),
                    newText: ''
                });
            }
            continue;
        }

        let currentLevel = indentLevel;
        let isCase = false;

        const blockEndMatch = VAL_BLOCK_END_REGEX.exec(trimmed);

        // 1. DEDENT LOGIC

        // End Select
        if (blockEndMatch && blockEndMatch[1].toLowerCase() === 'select') {
            if (selectStack.length > 0) {
                if (selectStack[selectStack.length - 1]) {
                    indentLevel--; // Close previous Case
                }
                selectStack.pop(); // Close Select
                indentLevel--; // Dedent Select
            } else {
                indentLevel--;
            }
            currentLevel = indentLevel;
        }
        // Other End Blocks
        else if (
            blockEndMatch ||
            VAL_NEXT_REGEX.test(trimmed) ||
            VAL_LOOP_REGEX.test(trimmed) ||
            VAL_WEND_REGEX.test(trimmed)
        ) {
            indentLevel--;
            currentLevel = indentLevel;
        }
        // Case
        else if (FMT_CASE_REGEX.test(trimmed)) {
            isCase = true;
            if (selectStack.length > 0) {
                if (selectStack[selectStack.length - 1]) {
                    indentLevel--; // Close previous Case
                }
                selectStack[selectStack.length - 1] = true; // Mark Case opened
            }
            currentLevel = indentLevel;
        }
        // Else
        else if (FMT_ELSE_REGEX.test(trimmed)) {
            currentLevel = indentLevel - 1;
        }

        if (currentLevel < 0) currentLevel = 0;
        if (indentLevel < 0) indentLevel = 0;

        const desiredIndent = indentString.repeat(currentLevel);

        if (line !== desiredIndent + trimmed) {
            edits.push({
                range: Range.create(i, 0, i, line.length),
                newText: desiredIndent + trimmed
            });
        }

        // 2. INDENT NEXT LOGIC

        // Select Case
        if (VAL_SELECT_CASE_START_REGEX.test(trimmed)) {
            indentLevel++;
            selectStack.push(false);
        }
        // Case
        else if (isCase) {
            indentLevel++;
        }
        // Other Blocks
        else if (shouldIndentNext(trimmed)) {
            indentLevel++;
        }
    }

    Logger.debug(`Formatting: Generated ${edits.length} edits.`);
    return edits;
}

/**
 * Handles range formatting requests.
 * Formats the entire document to ensure context is correct, then filters edits to the requested range.
 *
 * @param document The document to format.
 * @param range The range to format.
 * @param options Formatting options.
 * @returns An array of TextEdits within the range.
 */
export function formatRange(
    document: TextDocument,
    range: Range,
    options: FormattingOptions
): TextEdit[] {
    Logger.log(
        `Range formatting requested for ${document.uri} at ${range.start.line}-${range.end.line}`
    );
    const allEdits = formatDocument(document, options);

    const rangeEdits = allEdits.filter((edit) => {
        // Check if edit overlaps with range
        // Since we are formatting full lines, we check if edit line is within range lines.
        // Range start line is inclusive, end line is inclusive (usually).
        // VS Code usually sends selection range.

        const editLine = edit.range.start.line;
        return editLine >= range.start.line && editLine <= range.end.line;
    });

    Logger.debug(`Range Formatting: Filtered to ${rangeEdits.length} edits.`);
    return rangeEdits;
}

/**
 * Checks if a line opens a block that requires indentation for the next line.
 *
 * @param line The line content.
 * @returns True if the next line should be indented.
 */
function shouldIndentNext(line: string): boolean {
    // Blocks that increase indentation (Excluding Select Case which is handled manually)
    if (VAL_SELECT_CASE_START_REGEX.test(line)) return false;

    return (
        VAL_BLOCK_START_REGEX.test(line) ||
        FMT_IF_THEN_START_REGEX.test(line) ||
        VAL_FOR_START_REGEX.test(line) ||
        VAL_DO_START_REGEX.test(line) ||
        VAL_WHILE_START_REGEX.test(line)
    );
}
