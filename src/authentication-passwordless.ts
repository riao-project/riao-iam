import { DatabaseRecord, DatabaseRecordId } from '@riao/dbal';
import {
	AuthenticationBase,
	AuthenticationOptions,
} from './authentication-base';
import { Jwt, JwtOptions } from './jwt';
import { AuthenticationError } from './errors/authentication-error';

export interface MagicLinkPayload {
	type: 'magic-link';
	userId: DatabaseRecordId;
}

export interface PasswordlessAuthenticationOptions
	extends AuthenticationOptions {
	jwt: JwtOptions;
}

export interface TokenOptions {
	expiresIn: string;
}

export const defaultTokenOptions: TokenOptions = {
	expiresIn: '5m',
};

export class AuthenticationPasswordless<
	TUser extends DatabaseRecord = DatabaseRecord
> extends AuthenticationBase<TUser> {
	protected jwt: Jwt<MagicLinkPayload>;

	public constructor(options: PasswordlessAuthenticationOptions) {
		super(options);

		this.jwt = new Jwt(options.jwt);
	}

	public async getMagicToken(
		credentials: { login: string },
		options: TokenOptions = defaultTokenOptions
	): Promise<string> {
		// Check user
		const user = await this.findActiveUser({
			where: <any>{ email: credentials.login },
		});

		// Generate & return token
		return await this.jwt.generateToken(
			{
				type: 'magic-link',
				userId: user.id,
			},
			{
				expiresIn: options.expiresIn,
			}
		);
	}

	public async login(credentials: { token: string }): Promise<TUser> {
		// Verify magic token
		const data = await this.jwt.decodeToken(credentials.token);

		if (data.type !== 'magic-link') {
			throw new AuthenticationError(
				'Wrong type of token provided for this operation.'
			);
		}

		// Check user
		const user = await this.findActiveUser({
			where: <any>{ id: data.userId },
		});

		return user;
	}
}
