import { TextDocument, TextEdit, FormattingOptions, Range, DocumentOnTypeFormattingParams } from 'vscode-languageserver/node';
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

interface LineState {
    level: number;
    trimmed: string;
}

/**
 * Computes the indentation level and trimmed content for each line.
 * @param lines The lines of the document.
 * @returns An array of LineState objects.
 */
function computeLineStates(lines: string[]): LineState[] {
    let indentLevel = 0;
    const selectStack: boolean[] = []; // true = case opened
    const states: LineState[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let trimmed = line.trim();

        // Apply keyword casing formatting
        trimmed = formatKeywordCasing(trimmed);

        // Apply spacing formatting
        trimmed = formatLine(trimmed);

        if (trimmed === '') {
             // For empty lines, we keep the current indentLevel as the "level" for this line.
             // This is important for "On Type Formatting" to indent correctly on new empty lines.
             states.push({ level: indentLevel, trimmed });
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

        states.push({ level: currentLevel, trimmed });

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
    return states;
}

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
    const indentString = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';

    const states = computeLineStates(lines);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const state = states[i];

        // Standard Formatting: Empty lines are cleared (no whitespace).
        if (state.trimmed === '') {
            if (line.length > 0) {
                edits.push({
                    range: Range.create(i, 0, i, line.length),
                    newText: ''
                });
            }
            continue;
        }

        const desiredIndent = indentString.repeat(state.level);

        if (line !== desiredIndent + state.trimmed) {
            edits.push({
                range: Range.create(i, 0, i, line.length),
                newText: desiredIndent + state.trimmed
            });
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
        const editLine = edit.range.start.line;
        return editLine >= range.start.line && editLine <= range.end.line;
    });

    Logger.debug(`Range Formatting: Filtered to ${rangeEdits.length} edits.`);
    return rangeEdits;
}

/**
 * Handles on type formatting requests.
 * Formats the line where the trigger character was typed.
 *
 * @param document The document to format.
 * @param params The formatting parameters.
 * @returns An array of TextEdits.
 */
export function formatOnType(
    document: TextDocument,
    params: DocumentOnTypeFormattingParams
): TextEdit[] {
    Logger.log(`On Type Formatting requested at ${document.uri} for character '${params.ch}'`);
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const indentString = params.options.insertSpaces ? ' '.repeat(params.options.tabSize) : '\t';

    const states = computeLineStates(lines);
    const lineIndex = params.position.line;

    // Safety check
    if (lineIndex >= lines.length) return [];

    const state = states[lineIndex];
    const line = lines[lineIndex];

    // For OnType, if line is empty, we DO want to indent it.
    // The user pressed Enter, so they want cursor at correct indentation.

    const desiredIndent = indentString.repeat(state.level);

    // If line is empty, newText is just indentation.
    // If line is not empty, it is indentation + trimmed.

    const newText = desiredIndent + state.trimmed;

    // Only return edit if text is different
    if (line !== newText) {
        return [{
            range: Range.create(lineIndex, 0, lineIndex, line.length),
            newText: newText
        }];
    }

    return [];
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
