import {
    DocumentLink,
    DocumentLinkParams,
    Range
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';

/**
 * Handles document link requests.
 * Scans the document for URLs (http/https) and returns them as clickable links.
 *
 * @param params The document link parameters.
 * @param document The text document.
 * @returns An array of DocumentLinks.
 */
export function onDocumentLinks(
    params: DocumentLinkParams,
    document: TextDocument
): DocumentLink[] {
    const links: DocumentLink[] = [];
    const text = document.getText();

    // Regex to match URLs (http or https)
    // Matches http:// or https:// followed by non-whitespace and non-quote characters
    // We also exclude common trailing punctuation that might be part of a sentence: ., ), ]
    // A simple robust approach is to match until whitespace or quote, then trim trailing punctuation.
    const urlRegex = /(https?:\/\/[^\s'"<>()]+)/g;

    let match;
    while ((match = urlRegex.exec(text)) !== null) {
        let url = match[1];
        const start = match.index;

        // Trim trailing punctuation (.,;:!?) that might have been matched
        while (url.length > 0 && /[.,;:!?]/.test(url[url.length - 1])) {
            url = url.substring(0, url.length - 1);
        }

        if (url.length === 0) continue;

        const end = start + url.length;

        const range = Range.create(
            document.positionAt(start),
            document.positionAt(end)
        );

        links.push({
            range: range,
            target: url,
            tooltip: `Follow link: ${url}`
        });
    }

    Logger.debug(`DocumentLink: Found ${links.length} links in ${document.uri}`);
    return links;
}
