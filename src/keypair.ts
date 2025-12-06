import * as crypto from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

export type KeyPairAlgorithm =
	| 'RS256'
	| 'RS384'
	| 'RS512'
	| 'HS256'
	| 'ES256'
	| 'ES384'
	| 'ES512';

export interface KeyPair {
	publicKey: crypto.KeyObject;
	privateKey: crypto.KeyObject;
	algorithm: KeyPairAlgorithm;
}

export class KeyPairGenerator {
	public algorithm: KeyPairAlgorithm;

	public constructor(options: { algorithm: KeyPairAlgorithm }) {
		this.algorithm = options.algorithm;
	}

	public generate(): KeyPair {
		let type: 'rsa' | 'ec' | null = null;
		let modulusLength, namedCurve;

		if (this.algorithm === 'RS256') {
			type = 'rsa';
			modulusLength = 2048;
		}
		else if (this.algorithm === 'RS384') {
			type = 'rsa';
			modulusLength = 3072;
		}
		else if (this.algorithm === 'RS512') {
			type = 'rsa';
			modulusLength = 4096;
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

		if (type === null) {
			throw new Error('Keypair type could not be inferred');
		}

		const { publicKey, privateKey } = crypto.generateKeyPairSync(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			type as any,
			{
				modulusLength,
				namedCurve,
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
		const publicKey = options.keys.publicKey;
		const privateKey = options.keys.privateKey;

		writeFileSync(
			options.publicKeyPath,
			publicKey.export({ format: 'pem', type: 'spki' })
		);
		writeFileSync(
			options.privateKeyPath,
			privateKey.export({ format: 'pem', type: 'pkcs8' })
		);
	}
}
