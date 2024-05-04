import * as jwt from 'jsonwebtoken';

import { AccessTokenPayload, TokenPayload } from './token';
import { IamError } from './errors/error';
import { Secret, SecretAlgorithm } from './secret';
import { KeyPair, KeyPairAlgorithm } from './keypair';
import { KeyObject } from 'crypto';

export type JwtPayload = Record<string, any>;

export type JwtSigningOptions = Secret | KeyPair;

export type JwtOptions = JwtSigningOptions & {
	expiresIn?: number | string;
	notBefore?: number | string;
};

export class Jwt<TPayload extends JwtPayload = JwtPayload> {
	protected publicKey: KeyObject;
	protected privateKey: KeyObject;

	protected expiresIn?: number | string;
	protected notBefore?: number | string;
	protected algorithm?: SecretAlgorithm | KeyPairAlgorithm;

	public constructor(options: JwtOptions) {
		let algorithm;

		for (const option in options) {
			const value = options[option];

			if (option === 'secret') {
				this.publicKey = value;
				this.privateKey = value;
			}
			else {
				this[option] = value;
			}
		}

		this.algorithm = options.algorithm ?? algorithm;
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
	): Promise<string> {
		return await jwt.sign(data, this.privateKey, {
			...this.tokenOptions(),
			...options,
		});
	}

	public async decodeToken(token: string): Promise<TPayload> {
		const result = <TPayload>await jwt.verify(token, this.publicKey);

		delete result.iat;
		delete result.nbf;
		delete result.exp;

		return result;
	}

	public async verifyAccessToken(token: string): Promise<TPayload> {
		const data = <AccessTokenPayload>(
			(<unknown>await this.decodeToken(token))
		);

		if (data.type !== 'access') {
			throw new IamError('Expected access token, received ' + data.type);
		}

		delete data.type;

		return <any>data;
	}

	public async verifyRefreshToken(token: string): Promise<TPayload> {
		const data = <TokenPayload>(<unknown>await this.decodeToken(token));

		if (data.type !== 'refresh') {
			throw new IamError('Expected refresh token, received ' + data.type);
		}

		delete data.type;

		return <any>data;
	}
}
