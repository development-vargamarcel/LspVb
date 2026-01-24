import { Connection } from 'vscode-languageserver/node';

/**
 * A simple logging utility for the Language Server.
 * Sends log messages to the client via the LSP connection.
 */
export class Logger {
    private static connection: Connection | null = null;

    /**
     * Sets the LSP connection to be used for logging.
     * @param connection The LSP connection object.
     */
    static setConnection(connection: Connection) {
        Logger.connection = connection;
    }

    /**
     * Logs an informational message.
     * @param message The message to log.
     */
    static log(message: string) {
        if (Logger.connection) {
            Logger.connection.console.log(`[Info] ${message}`);
        }
    }

    /**
     * Logs a debug message.
     * @param message The message to log.
     */
    static debug(message: string) {
        if (Logger.connection) {
            Logger.connection.console.log(`[Debug] ${message}`);
        }
    }

    /**
     * Logs an error message.
     * @param message The message to log.
     */
    static error(message: string) {
        if (Logger.connection) {
            Logger.connection.console.error(`[Error] ${message}`);
        }
    }

    /**
     * Logs a warning message.
     * @param message The message to log.
     */
    static warn(message: string) {
        if (Logger.connection) {
            // console.warn might not exist on connection, using log with [Warn]
            Logger.connection.console.log(`[Warn] ${message}`);
        }
    }
}
