import { FoldingRange, FoldingRangeParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

export function onFoldingRanges(params: FoldingRangeParams, document: TextDocument): FoldingRange[] {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const ranges: FoldingRange[] = [];
    const stack: { line: number, type: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
        // Remove comments for analysis
        const rawLine = lines[i];
        const line = rawLine.split("'")[0].trim();
        if (!line) continue;

        // Check for block ends
        let endMatch = false;
        if (/^End\s+(Sub|Function|If|Class|Module)/i.test(line)) endMatch = true;
        else if (/^Next(\s+|$)/i.test(line)) endMatch = true;
        else if (/^Wend(\s+|$)/i.test(line)) endMatch = true;
        else if (/^Loop(\s+|$)/i.test(line)) endMatch = true;

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

        if (/^(?:(Public|Private|Friend|Protected)\s+)?(Sub|Function|Class|Module)\b/i.test(line)) {
            startType = 'block';
        } else if (/^If\b.*?\bThen\s*$/i.test(line)) {
             // Block If check: If ... Then (and nothing else on line)
             startType = 'if';
        } else if (/^For\b/i.test(line)) {
             startType = 'for';
        } else if (/^While\b/i.test(line)) {
             startType = 'while';
        } else if (/^Do\b/i.test(line)) {
             startType = 'do';
        }

        if (startType) {
            stack.push({ line: i, type: startType });
        }
    }

    return ranges;
}
