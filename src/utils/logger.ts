export class Logger {
    private static connection: any = null;

    static setConnection(connection: any) {
        Logger.connection = connection;
    }

    static log(message: string) {
        if (Logger.connection) {
            Logger.connection.console.log(`[Info] ${message}`);
        }
    }

    static error(message: string) {
        if (Logger.connection) {
            Logger.connection.console.error(`[Error] ${message}`);
        }
    }

    static warn(message: string) {
        if (Logger.connection) {
            // console.warn might not exist on connection, using log with [Warn]
            Logger.connection.console.log(`[Warn] ${message}`);
        }
    }
}
