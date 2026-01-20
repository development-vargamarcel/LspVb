
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
