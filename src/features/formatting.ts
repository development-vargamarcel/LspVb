import { TextDocument, TextEdit, FormattingOptions, Range } from 'vscode-languageserver/node';

export function formatDocument(document: TextDocument, options: FormattingOptions): TextEdit[] {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const edits: TextEdit[] = [];

    let indentLevel = 0;
    const indentString = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';

    // Regex definitions
    // Start blocks
    const blockStartRegex = /^\s*(?:(?:Public|Private|Friend|Protected)\s+)?(?:Sub|Function|Class|Module|Property)\b/i;
    const ifStartRegex = /^\s*If\b.*\bThen\s*(?:'.*)?$/i; // Ends with Then (and optional comment)
    const forStartRegex = /^\s*For\b/i;
    const doStartRegex = /^\s*Do\b/i;
    const selectStartRegex = /^\s*Select\s+Case\b/i;
    const whileStartRegex = /^\s*While\b/i;

    // End blocks
    const blockEndRegex = /^\s*End\s+(?:Sub|Function|Class|Module|Property|If|Select)\b/i;
    const nextRegex = /^\s*Next\b/i;
    const loopRegex = /^\s*Loop\b/i;
    const wendRegex = /^\s*Wend\b/i;

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
        if (blockEndRegex.test(trimmed) ||
            nextRegex.test(trimmed) ||
            loopRegex.test(trimmed) ||
            wendRegex.test(trimmed)) {
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
        if (blockStartRegex.test(trimmed) ||
            ifStartRegex.test(trimmed) ||
            forStartRegex.test(trimmed) ||
            doStartRegex.test(trimmed) ||
            selectStartRegex.test(trimmed) ||
            whileStartRegex.test(trimmed)) {
            indentLevel++;
        }
    }

    return edits;
}
