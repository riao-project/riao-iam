import * as jwt from 'jsonwebtoken';
import * as jwtTimespan from 'jsonwebtoken/lib/timespan';

import { AccessTokenPayload, AuthTokenPayload } from './token';
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

export interface Token {
	token: string;
	expiration: number;
}

export class Jwt<TPayload extends JwtPayload = JwtPayload> {
	protected publicKey: KeyObject;
	protected privateKey: KeyObject;

	protected expiresIn?: number | string;
	protected notBefore?: number | string;
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

		const expiration = jwtTimespan(options.expiresIn);
		const token = await jwt.sign(data, this.privateKey, options);

		return { token, expiration };
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
		const data = <AuthTokenPayload>(<unknown>await this.decodeToken(token));

		if (data.type !== 'refresh') {
			throw new IamError('Expected refresh token, received ' + data.type);
		}

		delete data.type;

		return <any>data;
	}
}
