import * as crypto from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

export interface KeyPair {
	publicKey: crypto.KeyObject;
	privateKey: crypto.KeyObject;
	algorithm: KeyPairAlgorithm;
}

export type KeyPairAlgorithm =
	| 'RS256'
	| 'RS384'
	| 'RS512'
	| 'ES256'
	| 'ES384'
	| 'ES512';

export class KeyPairGenerator {
	public algorithm: KeyPairAlgorithm;

	public constructor(options: { algorithm: KeyPairAlgorithm }) {
		this.algorithm = options.algorithm;
	}

	public generate(): KeyPair {
		let type: 'rsa' | 'ec';
		let modulusLength, namedCurve;

		if (this.algorithm.startsWith('RS')) {
			type = 'rsa';
			modulusLength = 2048;
		}
		else if (this.algorithm === 'ES256') {
			type = 'ec';
			namedCurve = 'prime256v1';
		}
		else if (this.algorithm === 'ES384') {
			type = 'ec';
			namedCurve = 'secp384r1';
		}
		else if (this.algorithm === 'ES512') {
			type = 'ec';
			namedCurve = 'secp521r1';
		}

		const { publicKey, privateKey } = crypto.generateKeyPairSync(
			<any>type,
			{
				modulusLength,
				namedCurve,
				publicKeyEncoding: {
					type: 'spki',
					format: 'pem',
				},
				privateKeyEncoding: {
					type: 'pkcs8',
					format: 'pem',
				},
			}
		);

		return {
			algorithm: this.algorithm,
			publicKey,
			privateKey,
		};
	}

	public load(options: {
		publicKeyPath: string;
		privateKeyPath: string;
	}): KeyPair {
		const publicKey = readFileSync(options.publicKeyPath).toString();
		const privateKey = readFileSync(options.privateKeyPath).toString();

		return {
			algorithm: this.algorithm,
			publicKey: crypto.createPublicKey(publicKey),
			privateKey: crypto.createPrivateKey(privateKey),
		};
	}

	public save(options: {
		keys: KeyPair;
		publicKeyPath: string;
		privateKeyPath: string;
	}): void {
		writeFileSync(options.publicKeyPath, options.keys.publicKey.export());
		writeFileSync(options.privateKeyPath, options.keys.privateKey.export());
	}
}
