import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver/node';
import { validateTextDocument } from '../features/validation';
import { Logger } from './logger';

/**
 * Manages the scheduling of document validation to prevent excessive processing.
 * Implements a debounce mechanism (200ms) so validation only runs after the user stops typing.
 */
export class ValidationScheduler {
    private validationTimers: Map<string, NodeJS.Timeout> = new Map();
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Schedules a validation run for the given document.
     * If a validation is already pending, it is cancelled and restarted.
     * @param document The text document to validate.
     */
    public scheduleValidation(document: TextDocument) {
        const uri = document.uri;
        if (this.validationTimers.has(uri)) {
            clearTimeout(this.validationTimers.get(uri)!);
        }

        const timer = setTimeout(() => {
            try {
                const diagnostics = validateTextDocument(document);
                this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
            } catch (error) {
                Logger.error(`Validation failed: ${error}`);
            } finally {
                this.validationTimers.delete(uri);
            }
        }, 200); // 200ms delay

        this.validationTimers.set(uri, timer);
    }

    /**
     * Clears any pending validation for the given document.
     * @param document The text document.
     */
    public clear(document: TextDocument) {
        const uri = document.uri;
        if (this.validationTimers.has(uri)) {
            clearTimeout(this.validationTimers.get(uri)!);
            this.validationTimers.delete(uri);
        }
    }
}
