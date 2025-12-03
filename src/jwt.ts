import * as jwt from 'jsonwebtoken';
import ms from 'ms';

import { Secret, SecretAlgorithm } from './secret';
import { KeyPair, KeyPairAlgorithm } from './keypair';
import {
	createPrivateKey,
	createPublicKey,
	createSecretKey,
	KeyObject,
} from 'crypto';

export type JwtPayload = Record<string, any>;

export type JwtSigningOptions = Secret | KeyPair;

export type JwtOptions = JwtSigningOptions & {
	expiresIn?: ms.StringValue;
	notBefore?: ms.StringValue;
};

export interface Token {
	token: string;
}

export class Jwt<TPayload extends JwtPayload = JwtPayload> {
	protected publicKey: KeyObject;
	protected privateKey: KeyObject;

	protected expiresIn?: ms.StringValue;
	protected notBefore?: ms.StringValue;
	protected algorithm?: SecretAlgorithm | KeyPairAlgorithm;

	public constructor(options: JwtOptions) {
		this.expiresIn = options.expiresIn ?? this.expiresIn;
		this.notBefore = options.notBefore ?? this.notBefore;
		this.algorithm = options.algorithm ?? this.algorithm;

		if ('secret' in options && options.secret) {
			this.privateKey = this.publicKey = createSecretKey(
				Buffer.from(options.secret)
			);
		}
		else if ('privateKey' in options && options.privateKey) {
			this.publicKey =
				typeof options.publicKey === 'string'
					? createPublicKey(options.publicKey)
					: options.publicKey;

			this.privateKey =
				typeof options.privateKey === 'string'
					? createPrivateKey(options.privateKey)
					: options.privateKey;
		}
	}

	protected tokenOptions(): jwt.SignOptions {
		return {
			expiresIn: this.expiresIn ?? '15m',
			notBefore: this.notBefore ?? 1,
			algorithm: this.algorithm,
		};
	}

	public async generateToken(
		data: TPayload,
		options: jwt.SignOptions = {}
	): Promise<Token> {
		options = {
			...this.tokenOptions(),
			...options,
		};

		const token = await jwt.sign(data, this.privateKey, options);

		return { token };
	}

	public async decodeToken(token: string): Promise<TPayload> {
		const result = <TPayload>await jwt.verify(token, this.publicKey);

		delete result['iat'];
		delete result['nbf'];
		delete result['exp'];

		return result;
	}
}
