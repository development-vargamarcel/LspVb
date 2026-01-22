import { TextDocument, TextEdit, FormattingOptions, Range } from 'vscode-languageserver/node';
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

export function formatDocument(document: TextDocument, options: FormattingOptions): TextEdit[] {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const edits: TextEdit[] = [];

    let indentLevel = 0;
    const indentString = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
    const selectStack: boolean[] = []; // true = case opened

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

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

    return edits;
}

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
