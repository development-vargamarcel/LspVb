import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';

/**
 * Strips comments from a line of Visual Basic code, respecting string literals.
 * @param line The line of code to process.
 * @returns The line content before the comment starts.
 */
export function stripComment(line: string): string {
    let inString = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inString = !inString;
        } else if (char === "'" && !inString) {
            return line.substring(0, i);
        }
    }
    return line;
}

/**
 * Gets the word at the specified position in the document.
 * @param document The text document.
 * @param position The position to check.
 * @returns The word at the position, or an empty string if none found.
 */
export function getWordAtPosition(document: TextDocument, position: Position): string {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Identify word boundaries
    let start = offset;
    while (start > 0 && /[\w]/.test(text.charAt(start - 1))) {
        start--;
    }

    let end = offset;
    while (end < text.length && /[\w]/.test(text.charAt(end))) {
        end++;
    }

    if (start === end) {
        return '';
    }

    return text.substring(start, end);
}
