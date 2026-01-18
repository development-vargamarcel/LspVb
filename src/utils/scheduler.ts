import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from 'vscode-languageserver/node';
import { validateTextDocument } from '../features/validation';
import { Logger } from './logger';

export class ValidationScheduler {
    private validationTimers: Map<string, NodeJS.Timeout> = new Map();
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

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

    public clear(document: TextDocument) {
        const uri = document.uri;
        if (this.validationTimers.has(uri)) {
            clearTimeout(this.validationTimers.get(uri)!);
            this.validationTimers.delete(uri);
        }
    }
}
