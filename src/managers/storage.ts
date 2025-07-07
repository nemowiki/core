import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import CryptoUtils from '../utils/crypto.js';

export default class StorageManager {
    static #storage: S3Client;
    static #BUCKET_NAME: string;
    static #BUCKET_URL: string;

    static #allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    static #allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

    static async init(AWS_BUCKET_NAME: string, AWS_ID: string, AWS_SECRET: string) {
        this.#BUCKET_NAME = AWS_BUCKET_NAME;
        this.#BUCKET_URL = `https://${AWS_BUCKET_NAME}.s3.ap-northeast-2.amazonaws.com`;
        this.#storage = new S3Client({
            region: 'ap-northeast-2',
            credentials: {
                accessKeyId: AWS_ID,
                secretAccessKey: AWS_SECRET,
            },
        });
    }

    static getFilePathFromKey(key: string): string {
        return `${this.#BUCKET_URL}/${key}`;
    }

    static async #validateFile(file: File): Promise<boolean> {
        const fileName = file.name.toLowerCase();
        const ext = fileName.split('.').pop();

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const mimeFromBrowser = file.type;
        const detected = await fileTypeFromBuffer(buffer);
        const mimeFromMagic = detected?.mime;

        const isExtAllowed = ext && this.#allowedExtensions.includes(ext);

        const isMimeAllowed = mimeFromMagic
            ? this.#allowedMimeTypes.includes(mimeFromMagic)
            : this.#allowedMimeTypes.includes(mimeFromBrowser);

        if (!mimeFromMagic && ext === 'svg' && mimeFromBrowser === 'image/svg+xml') {
            return true;
        }

        if (isMimeAllowed && isExtAllowed) {
            return true;
        }

        return false;
    }

    static async uploadImageToStorage(file: File): Promise<string> {
        if (!(await this.#validateFile(file))) throw new Error('The file is wrong or not allowed');

        const buffer = await file.arrayBuffer();
        const ext = file.name.split('.').pop();
        const mimetype = file.type;

        const key = `images/${CryptoUtils.createUUID()}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: this.#BUCKET_NAME,
            Key: key,
            Body: Buffer.from(buffer),
            ContentType: mimetype,
        });

        await this.#storage.send(command);

        return key;
    }

    static async deleteImageFromStorage(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.#BUCKET_NAME,
            Key: key,
        });
        await this.#storage.send(command);
    }

    static async uploadBackupToStorage(fileKey: string, content: string) {
        await this.#storage.send(
            new PutObjectCommand({
                Bucket: this.#BUCKET_NAME,
                Key: `backups/${fileKey}`,
                Body: content,
                ContentType: 'application/json',
            }),
        );
    }
}
