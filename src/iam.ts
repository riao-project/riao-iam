import { DatabaseRecordId } from '@riao/dbal';
import { Jwt } from './jwt';
import { AccessRefreshTokens, AccessTokenPayload } from './token';
import { AuthenticationBase } from './authentication-base';
import { AuthenticationError } from './errors/authentication-error';

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

	public constructor(options: IamOptions = {}) {
		this.authn = options.authn ?? this.authn;
		this.jwt = options.jwt ?? this.jwt;
		this.accessTTL = options.accessTTL ?? this.accessTTL;
		this.refreshTTL = options.refreshTTL ?? this.refreshTTL;
	}

	public async login(credentials: TLogin) {
		const user = await this.authn.login(credentials);

		return await this.getAuthTokens(user.id);
	}

	public async verifyAccessToken(options: {
		userId?: DatabaseRecordId;
		accessToken: string;
	}): Promise<Omit<AccessTokenPayload, 'type'>> {
		const payload = <AccessTokenPayload>(
			await this.jwt.verifyAccessToken(options.accessToken)
		);

		if (options.userId && payload.userId !== options.userId) {
			throw new AuthenticationError(
				'Provided access token is not for this user'
			);
		}

		return payload;
	}

	public async refresh(userId: DatabaseRecordId, token: string) {
		await this.jwt.verifyRefreshToken(token);

		await this.authn.findActiveUser({ where: { id: userId } });

		return {
			userId,
			access: await this.getAccessToken(userId),
		};
	}

	protected async getAccessToken(userId: DatabaseRecordId) {
		// Generate access token
		return await this.jwt.generateToken(
			<AccessTokenPayload>{
				type: 'access',
				userId,
				scopes: [], // TODO: Fetch scopes?
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

		return { userId, access, refresh };
	}
}
