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

export class Encryptor {
	private publicKey: crypto.KeyObject;

	constructor(publicKey: crypto.KeyObject) {
		this.publicKey = publicKey;
	}

	encrypt(data: string | Buffer): Buffer {
		return encrypt(this.publicKey, data);
	}
}

export class Decryptor {
	private privateKey: crypto.KeyObject;

	constructor(privateKey: crypto.KeyObject) {
		this.privateKey = privateKey;
	}

	decrypt(encryptedData: Buffer): Buffer {
		return decrypt(this.privateKey, encryptedData);
	}
}
