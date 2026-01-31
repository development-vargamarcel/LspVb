import {
    Color,
    ColorInformation,
    ColorPresentation,
    ColorPresentationParams,
    DocumentColorParams,
    Range,
    TextEdit
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';

// Map of standard .NET colors (subset for example)
const NAMED_COLORS: Record<string, Color> = {
    Red: { red: 1, green: 0, blue: 0, alpha: 1 },
    Green: { red: 0, green: 0.5, blue: 0, alpha: 1 }, // System.Drawing.Color.Green is darker than Lime
    Blue: { red: 0, green: 0, blue: 1, alpha: 1 },
    White: { red: 1, green: 1, blue: 1, alpha: 1 },
    Black: { red: 0, green: 0, blue: 0, alpha: 1 },
    Yellow: { red: 1, green: 1, blue: 0, alpha: 1 },
    Cyan: { red: 0, green: 1, blue: 1, alpha: 1 },
    Magenta: { red: 1, green: 0, blue: 1, alpha: 1 },
    Gray: { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 },
    LightGray: { red: 0.827, green: 0.827, blue: 0.827, alpha: 1 },
    DarkGray: { red: 0.663, green: 0.663, blue: 0.663, alpha: 1 }, // Matches .NET DarkGray
    Orange: { red: 1, green: 0.647, blue: 0, alpha: 1 },
    Purple: { red: 0.5, green: 0, blue: 0.5, alpha: 1 },
    Brown: { red: 0.647, green: 0.165, blue: 0.165, alpha: 1 },
    Pink: { red: 1, green: 0.753, blue: 0.796, alpha: 1 }
};

/**
 * Handles document color requests.
 * Finds color references (e.g. Color.Red, Color.FromArgb(255, 0, 0)) in the document.
 */
export function onDocumentColor(
    params: DocumentColorParams,
    document: TextDocument
): ColorInformation[] {
    const text = document.getText();
    const colors: ColorInformation[] = [];

    // 1. Match Named Colors: Color.Name
    const namedColorRegex = /\bColor\.([a-zA-Z]+)\b/g;
    let match;

    while ((match = namedColorRegex.exec(text)) !== null) {
        const colorName = match[1];
        if (NAMED_COLORS[colorName]) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            colors.push({
                range: Range.create(startPos, endPos),
                color: NAMED_COLORS[colorName]
            });
        }
    }

    // 2. Match Color.FromArgb(r, g, b) or Color.FromArgb(a, r, g, b)
    // Simplified regex: Color.FromArgb\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)
    // Note: VB handles arguments without parens sometimes? No, method call usually has parens.
    const fromArgbRegex = /\bColor\.FromArgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+)\s*)?\)/g;
    while ((match = fromArgbRegex.exec(text)) !== null) {
        // match[1], match[2], match[3] are R, G, B (or A, R, G)
        // Check if 3 or 4 args.
        // Actually the regex above assumes arg4 is optional at the end.
        // But Color.FromArgb has overloads: (r, g, b) and (a, r, g, b).
        // If 4 args, first is Alpha.

        // Let's adjust regex to be robust.
        // We match 3 numbers first.
        // If there is a 4th, it's captured.
        // Wait, regex above captures 3 mandatory, 1 optional.
        // If (255, 0, 0) -> 1=255, 2=0, 3=0, 4=undefined. -> R, G, B.
        // If (100, 255, 0, 0) -> 1=100, 2=255, 3=0, 4=0. -> A, R, G, B.

        let a = 1, r = 0, g = 0, b = 0;

        if (match[4]) {
            // 4 arguments: A, R, G, B
            // But wait, regex is greedy/ordered.
            // If I have (1, 2, 3, 4), match[1]=1, match[2]=2, match[3]=3, match[4]=4.
            a = parseInt(match[1]) / 255;
            r = parseInt(match[2]) / 255;
            g = parseInt(match[3]) / 255;
            b = parseInt(match[4]) / 255;
        } else {
            // 3 arguments: R, G, B
            r = parseInt(match[1]) / 255;
            g = parseInt(match[2]) / 255;
            b = parseInt(match[3]) / 255;
        }

        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);

        colors.push({
            range: Range.create(startPos, endPos),
            color: { red: r, green: g, blue: b, alpha: a }
        });
    }

    Logger.debug(`Found ${colors.length} colors in ${document.uri}`);
    return colors;
}

/**
 * Handles color presentation requests (converting a color selection back to text).
 */
export function onColorPresentation(
    params: ColorPresentationParams,
    document: TextDocument
): ColorPresentation[] {
    const { color, range } = params;
    // We prefer named colors if exact match?
    // Or just convert to Color.FromArgb?

    const r = Math.round(color.red * 255);
    const g = Math.round(color.green * 255);
    const b = Math.round(color.blue * 255);
    const a = Math.round(color.alpha * 255);

    // Check if it matches a named color
    let label = `Color.FromArgb(${r}, ${g}, ${b})`;
    if (a !== 255) {
        label = `Color.FromArgb(${a}, ${r}, ${g}, ${b})`;
    } else {
        // Try to find named color
        for (const [name, val] of Object.entries(NAMED_COLORS)) {
            if (val.red === color.red && val.green === color.green && val.blue === color.blue && val.alpha === color.alpha) {
                label = `Color.${name}`;
                break;
            }
        }
    }

    return [{
        label: label,
        textEdit: TextEdit.replace(range, label)
    }];
}
