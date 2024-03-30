import * as jwt from 'jsonwebtoken';

import { AccessTokenPayload, TokenPayload } from './token';
import { IamError } from './errors/error';

export type JwtPayload = string | object | Buffer;

export interface JwtOptions {
	publicKey: string;
	privateKey: string;
}

export class Jwt<TPayload extends JwtPayload = JwtPayload> {
	protected publicKey = '';
	protected privateKey = '';

	public constructor(options: JwtOptions) {
		for (const option in options) {
			this[option] = options[option];
		}
	}

	protected tokenOptions(): jwt.SignOptions {
		return {
			expiresIn: '15m',
			notBefore: 1,
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
		return <TPayload>await jwt.verify(token, this.publicKey);
	}

	public async verifyAccessToken(token: string): Promise<TPayload> {
		const data = <AccessTokenPayload>await this.decodeToken(token);

		if (data.type !== 'access') {
			throw new IamError('Expected access token, received ' + data.type);
		}

		delete data.type;

		return <any>data;
	}

	public async verifyRefreshToken(token: string): Promise<TPayload> {
		const data = <TokenPayload>await this.decodeToken(token);

		if (data.type !== 'refresh') {
			throw new IamError('Expected refresh token, received ' + data.type);
		}

		delete data.type;

		return <any>data;
	}
}
