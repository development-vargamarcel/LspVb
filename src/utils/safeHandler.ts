import { Logger } from './logger';

export function safeHandler<T, R>(
    handler: (params: T) => R,
    defaultValue: R,
    operationName: string
): (params: T) => R {
    return (params: T) => {
        try {
            return handler(params);
        } catch (error) {
            Logger.error(`${operationName} failed: ${error}`);
            return defaultValue;
        }
    };
}
