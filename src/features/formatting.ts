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
    VAL_WEND_REGEX
} from '../utils/regexes';

export function formatDocument(document: TextDocument, options: FormattingOptions): TextEdit[] {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const edits: TextEdit[] = [];

    let indentLevel = 0;
    const indentString = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';

    // Regex definitions
    // We reuse centralized regexes where possible.
    // Note: VAL_* regexes are case-insensitive and match start of line.

    // Additional Formatting-specific regexes
    const ifStartRegex = /^\s*If\b.*\bThen\s*(?:'.*)?$/i; // Ends with Then (and optional comment) - Stricter than validation for formatting purposes

    // Middle blocks (dedent for this line, indent for next)
    const elseRegex = /^\s*Else(?:If)?\b/i;
    const caseRegex = /^\s*Case\b/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === '') {
            continue; // Skip empty lines or handle them? usually we trim them
        }

        let currentLevel = indentLevel;

        // Check for decrease indent
        if (VAL_BLOCK_END_REGEX.test(trimmed) ||
            VAL_NEXT_REGEX.test(trimmed) ||
            VAL_LOOP_REGEX.test(trimmed) ||
            VAL_WEND_REGEX.test(trimmed)) {
            currentLevel--;
            indentLevel--; // Permanently decrease
        }
        else if (elseRegex.test(trimmed) || caseRegex.test(trimmed)) {
            currentLevel--; // Temporarily decrease for this line
        }

        if (currentLevel < 0) currentLevel = 0;
        if (indentLevel < 0) indentLevel = 0;

        const desiredIndent = indentString.repeat(currentLevel);

        // If current indentation is different, add edit
        // We match any leading whitespace and replace it
        const match = line.match(/^(\s*)/);
        const currentIndent = match ? match[1] : '';

        if (currentIndent !== desiredIndent || trimmed !== line.trimStart()) { // Also fix trailing whitespace if we replace the whole line?
            // Safer to just replace the leading whitespace
            // But wait, if we only replace leading whitespace, we might miss trimming the end?
            // Let's replace the whole line with desiredIndent + trimmed
             edits.push({
                range: Range.create(i, 0, i, line.length),
                newText: desiredIndent + trimmed
            });
        }

        // Check for increase indent for NEXT line
        if (VAL_BLOCK_START_REGEX.test(trimmed) ||
            ifStartRegex.test(trimmed) ||
            VAL_FOR_START_REGEX.test(trimmed) ||
            VAL_DO_START_REGEX.test(trimmed) ||
            VAL_SELECT_CASE_START_REGEX.test(trimmed) ||
            VAL_WHILE_START_REGEX.test(trimmed) ||
            elseRegex.test(trimmed) ||
            caseRegex.test(trimmed)
            ) {
             // Logic correction: Else/Case dedent for current line but indent for next?
             // Actually:
             // If ... Then
             //   Indent
             // Else
             //   Indent
             // End If

             // So 'Else' line itself is at Level-1, but subsequent lines are at Level.
             // If we handled 'Else' in decrease section (currentLevel--), then indentLevel is still high.
             // Wait, if indentLevel is 1.
             // If ... Then -> indentLevel becomes 1.
             // (next lines at 1)
             // Else -> We want it at 0. So currentLevel = indentLevel - 1.
             // But subsequent lines should be at 1. So indentLevel remains 1.
             // So we do NOT increase indentLevel for Else.

             if (elseRegex.test(trimmed) || caseRegex.test(trimmed)) {
                 // Do nothing to indentLevel, it stays high.
             } else {
                 indentLevel++;
             }
        }
    }

    return edits;
}
