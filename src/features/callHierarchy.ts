import {
    CallHierarchyItem,
    CallHierarchyPrepareParams,
    CallHierarchyIncomingCallsParams,
    CallHierarchyIncomingCall,
    CallHierarchyOutgoingCallsParams,
    CallHierarchyOutgoingCall,
    SymbolKind,
    Range,
    ReferenceParams
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Logger } from '../utils/logger';
import { getWordAtPosition, stripComment } from '../utils/textUtils';
import {
    parseDocumentSymbols,
    findSymbolAtPosition,
    getSymbolContainingPosition,
    findGlobalSymbol
} from '../utils/parser';
import { onReferences } from './references';

/**
 * Prepares for call hierarchy by identifying the symbol under the cursor.
 * @param params The prepare parameters.
 * @param document The text document.
 * @returns An array of CallHierarchyItem or null.
 */
export function onPrepareCallHierarchy(
    params: CallHierarchyPrepareParams,
    document: TextDocument
): CallHierarchyItem[] | null {
    Logger.log(
        `Call Hierarchy prepare requested at ${params.position.line}:${params.position.character}`
    );
    const word = getWordAtPosition(document, params.position);
    if (!word) {
        Logger.debug('Call Hierarchy: No word found at position.');
        return null;
    }

    const symbols = parseDocumentSymbols(document);
    const symbol = findSymbolAtPosition(symbols, word, params.position);

    if (!symbol) {
        Logger.debug(`Call Hierarchy: Symbol '${word}' not found.`);
        return null;
    }

    // Only allow Call Hierarchy on Method, Function, Property, Constructor
    if (
        symbol.kind !== SymbolKind.Method &&
        symbol.kind !== SymbolKind.Function &&
        symbol.kind !== SymbolKind.Constructor &&
        symbol.kind !== SymbolKind.Property
    ) {
        Logger.debug(`Call Hierarchy: Symbol '${symbol.name}' is not a function/method.`);
        return null;
    }

    const item: CallHierarchyItem = {
        name: symbol.name,
        kind: symbol.kind,
        uri: document.uri,
        range: symbol.range,
        selectionRange: symbol.selectionRange,
        detail: symbol.detail
    };

    return [item];
}

/**
 * Handles incoming calls request (Find Usages / Callers).
 * @param params The incoming calls parameters.
 * @param allDocuments All open documents.
 * @returns An array of CallHierarchyIncomingCall.
 */
export function onIncomingCalls(
    params: CallHierarchyIncomingCallsParams,
    allDocuments: TextDocument[]
): CallHierarchyIncomingCall[] {
    const item = params.item;
    Logger.log(`Call Hierarchy Incoming requested for ${item.name}`);

    // Find the document corresponding to the item
    const itemDoc = allDocuments.find((d) => d.uri === item.uri);
    if (!itemDoc) {
        Logger.debug(`Document for item ${item.uri} not found in open documents.`);
        return [];
    }

    // Use onReferences to find usages
    const refParams: ReferenceParams = {
        textDocument: { uri: item.uri },
        position: item.selectionRange.start, // Point to the symbol name
        context: { includeDeclaration: false }
    };

    const locations = onReferences(refParams, itemDoc, allDocuments);
    const incomingCalls: CallHierarchyIncomingCall[] = [];

    for (const loc of locations) {
        // Find the document for this location
        const locDoc = allDocuments.find((d) => d.uri === loc.uri);
        if (!locDoc) continue;

        // Parse symbols to find the container
        const symbols = parseDocumentSymbols(locDoc);
        const container = getSymbolContainingPosition(symbols, loc.range.start);

        if (
            container &&
            (container.kind === SymbolKind.Method ||
                container.kind === SymbolKind.Function ||
                container.kind === SymbolKind.Property ||
                container.kind === SymbolKind.Constructor)
        ) {
            // Create CallHierarchyItem for the container
            const callerItem: CallHierarchyItem = {
                name: container.name,
                kind: container.kind,
                uri: loc.uri,
                range: container.range,
                selectionRange: container.selectionRange,
                detail: container.detail
            };

            incomingCalls.push({
                from: callerItem,
                fromRanges: [loc.range]
            });
        } else {
            Logger.debug(
                `Reference at ${loc.uri}:${loc.range.start.line} is not inside a method/function.`
            );
        }
    }

    // Merge duplicate callers
    const mergedCalls: CallHierarchyIncomingCall[] = [];
    for (const call of incomingCalls) {
        const existing = mergedCalls.find(
            (c) =>
                c.from.uri === call.from.uri &&
                c.from.name === call.from.name &&
                c.from.range.start.line === call.from.range.start.line
        );
        if (existing) {
            existing.fromRanges.push(...call.fromRanges);
        } else {
            mergedCalls.push(call);
        }
    }

    return mergedCalls;
}

/**
 * Handles outgoing calls request (Find calls made by the symbol).
 * @param params The outgoing calls parameters.
 * @param allDocuments All open documents.
 * @returns An array of CallHierarchyOutgoingCall.
 */
export function onOutgoingCalls(
    params: CallHierarchyOutgoingCallsParams,
    allDocuments: TextDocument[]
): CallHierarchyOutgoingCall[] {
    const item = params.item;
    Logger.log(`Call Hierarchy Outgoing requested for ${item.name}`);

    const itemDoc = allDocuments.find((d) => d.uri === item.uri);
    if (!itemDoc) return [];

    // Get the range of the function body
    const startLine = item.range.start.line;
    const endLine = item.range.end.line;
    const text = itemDoc.getText();
    const lines = text.split(/\r?\n/);

    const symbols = parseDocumentSymbols(itemDoc);
    const outgoingCalls: CallHierarchyOutgoingCall[] = [];

    for (let i = startLine; i <= endLine; i++) {
        if (i >= lines.length) break;
        const line = lines[i];
        const stripped = stripComment(line);

        // Regex for words
        const regex = /\b\w+\b/g;
        let match;
        while ((match = regex.exec(stripped)) !== null) {
            const word = match[0];
            const col = match.index;

            const position = { line: i, character: col };
            const foundSymbol = findSymbolAtPosition(symbols, word, position);

            // Refined Logic:
            let targetSymbol = foundSymbol;
            let targetUri = item.uri;

            if (!targetSymbol) {
                // Search globally
                for (const doc of allDocuments) {
                    if (doc.uri === item.uri) continue;
                    const docSymbols = parseDocumentSymbols(doc);
                    const globalSym = findGlobalSymbol(docSymbols, word);
                    if (globalSym) {
                        targetSymbol = globalSym;
                        targetUri = doc.uri;
                        break;
                    }
                }
            }

            if (
                targetSymbol &&
                (targetSymbol.kind === SymbolKind.Method ||
                    targetSymbol.kind === SymbolKind.Function ||
                    targetSymbol.kind === SymbolKind.Property ||
                    targetSymbol.kind === SymbolKind.Constructor)
            ) {
                // Check self-definition again (only for local file)
                if (targetUri === item.uri) {
                    if (
                        item.selectionRange.start.line === i &&
                        item.selectionRange.start.character === col
                    ) {
                        continue;
                    }
                }

                // Add to outgoing calls
                const toItem: CallHierarchyItem = {
                    name: targetSymbol.name,
                    kind: targetSymbol.kind,
                    uri: targetUri,
                    range: targetSymbol.range,
                    selectionRange: targetSymbol.selectionRange,
                    detail: targetSymbol.detail
                };

                // Add range
                const range = Range.create(i, col, i, col + word.length);
                outgoingCalls.push({
                    to: toItem,
                    fromRanges: [range]
                });
            }
        }
    }

    // Merge duplicates
    const mergedCalls: CallHierarchyOutgoingCall[] = [];
    for (const call of outgoingCalls) {
        const existing = mergedCalls.find(
            (c) =>
                c.to.uri === call.to.uri &&
                c.to.name === call.to.name &&
                c.to.range.start.line === call.to.range.start.line
        );
        if (existing) {
            existing.fromRanges.push(...call.fromRanges);
        } else {
            mergedCalls.push(call);
        }
    }

    return mergedCalls;
}
