import { Logger } from './logger';

/**
 * Wraps an LSP request handler with try-catch logic for safe execution.
 * Logs any errors that occur during execution and returns a default value.
 * Also logs the start and end of the operation for debugging.
 *
 * @param handler The handler function to wrap.
 * @param defaultValue The value to return if the handler throws an error.
 * @param operationName The name of the operation (for logging purposes).
 * @returns A safe version of the handler.
 */
export function safeHandler<T, R>(
    handler: (params: T) => R,
    defaultValue: R,
    operationName: string
): (params: T) => R {
    return (params: T) => {
        Logger.debug(`[${operationName}] Started`);
        const start = Date.now();
        try {
            const result = handler(params);
            const duration = Date.now() - start;
            Logger.debug(`[${operationName}] Finished in ${duration}ms`);
            return result;
        } catch (error) {
            Logger.error(`${operationName} failed: ${error}`);
            return defaultValue;
        }
    };
}
