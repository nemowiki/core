import crypto from 'crypto';

export default class CryptoUtils {
    static createNewId(): string {
        return crypto.randomBytes(32).toString('base64');
    }

    static createUUID(): string {
        return crypto.randomUUID();
    }
}
