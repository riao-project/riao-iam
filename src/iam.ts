import { DatabaseRecordId } from '@riao/dbal';
import { Jwt } from './jwt';
import { AccessRefreshTokens, AccessTokenPayload } from './token';
import { AuthenticationBase } from './authentication-base';

export interface IamOptions {
	authn?: AuthenticationBase;
	jwt?: Jwt;
	accessTTL?: string;
	refreshTTL?: string;
}

export interface LoginInterface {
	login: string;
}

export class Iam<TLogin extends LoginInterface = LoginInterface> {
	protected authn: AuthenticationBase;
	protected jwt: Jwt;

	protected accessTTL = '15m';
	protected refreshTTL = '7d';

	public constructor(options?: IamOptions) {
		for (const key in options ?? {}) {
			this[key] = options[key];
		}

		if (!this.authn) {
			throw new Error('Iam cannot be created without authn');
		}

		if (!this.jwt) {
			throw new Error('Iam cannot be created without jwt');
		}
	}

	public async login(credentials: TLogin) {
		const user = await this.authn.login(credentials);

		return await this.getAuthTokens(user.id);
	}

	public async refresh(
		userId: DatabaseRecordId,
		token: string
	): Promise<AccessRefreshTokens> {
		await this.jwt.verifyRefreshToken(token);

		const user = await this.authn.findActiveUser({ where: { id: userId } });

		return await this.getAuthTokens(user.id);
	}

	protected async getAccessToken(userId: DatabaseRecordId) {
		// Generate access token
		return await this.jwt.generateToken(
			<AccessTokenPayload>{
				type: 'access',
				userId,
			},
			{ expiresIn: this.accessTTL }
		);
	}

	protected async getRefreshToken(userId: DatabaseRecordId) {
		return await this.jwt.generateToken(
			{ type: 'refresh', userId },
			{ expiresIn: this.refreshTTL }
		);
	}

	protected async getAuthTokens(userId: DatabaseRecordId) {
		const access = await this.getAccessToken(userId);
		const refresh = await this.getRefreshToken(userId);

		return { access, refresh };
	}
}
