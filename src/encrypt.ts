import * as crypto from 'crypto';

export function encrypt(
	publicKey: string | crypto.KeyObject,
	data: string | Buffer
): Buffer {
	data = Buffer.isBuffer(data) ? data : Buffer.from(data);
	return crypto.publicEncrypt(publicKey, data);
}

export function decrypt(
	privateKey: string | crypto.KeyObject,
	encryptedData: string | Buffer
): Buffer {
	encryptedData = Buffer.isBuffer(encryptedData)
		? encryptedData
		: Buffer.from(encryptedData);

	return crypto.privateDecrypt(privateKey, encryptedData);
}
