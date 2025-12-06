import * as crypto from 'crypto';

export function encrypt(
	publicKey: crypto.KeyObject,
	data: string | Buffer
): Buffer {
	data = Buffer.isBuffer(data) ? data : Buffer.from(data);
	return crypto.publicEncrypt(publicKey, data);
}

export function decrypt(
	privateKey: crypto.KeyObject,
	encryptedData: Buffer
): Buffer {
	return crypto.privateDecrypt(privateKey, encryptedData);
}
