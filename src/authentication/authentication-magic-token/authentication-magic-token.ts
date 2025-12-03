import { AuthenticationBase } from '../authentication-base';
import { Token, Jwt, JwtOptions } from '../../jwt';
import {
	defaultTokenOptions,
	MagicTokenPayload,
	MagicTokenRecord,
	TokenOptions,
} from './magic-token';
import { Account } from '../../../test/account';
import { QueryRepository } from '@riao/dbal';
import { AuthOptions } from '../../auth/auth';

export interface MagicTokenAuthenticationOptions<TAccount extends Account>
	extends AuthOptions<TAccount> {
	jwtOptions: JwtOptions;
}

export class MagicTokenAuthentication<
	TAccount extends Account = Account,
> extends AuthenticationBase<TAccount> {
	protected jwt: Jwt<MagicTokenPayload>;
	protected magicTokenTable = 'iam_magic_tokens';
	protected tokenColumn = 'token';
	protected magicTokenRepo: QueryRepository<MagicTokenRecord>;

	public constructor(options: MagicTokenAuthenticationOptions<TAccount>) {
		super(options);
		this.jwt = new Jwt(options.jwtOptions);
	}

	public async createMagicToken(
		credentials: { login: string },
		options: TokenOptions & { type: string } = {
			...defaultTokenOptions,
			type: 'auth',
		}
	): Promise<Token> {
		const account = await this.findActiveAccount({
			where: <any>{
				[this.loginColumn]: credentials.login,
			},
		});

		if (account === null) {
			throw new Error('Account not found or not active.');
		}

		const accountId = account[this.accountIdColumn];

		// Generate token
		const token = await this.jwt.generateToken(
			{
				type: 'magic-token',
				accountId: account[this.accountIdColumn],
			},
			{
				expiresIn: options.expiresIn,
			}
		);

		await this.magicTokenRepo.insertOne({
			record: {
				account_id: accountId,
				token: token.token,
				type: options.type,
			},
		});

		return token;
	}

	public async authenticate(credentials: {
		token: string;
		type: string;
	}): Promise<TAccount | null> {
		// Verify magic token
		const data = await this.jwt.decodeToken(credentials.token);

		if (data.type !== 'magic-token') {
			throw new Error('Wrong type of token provided for this operation.');
		}

		// Check account
		const account = await this.findActiveAccount({
			where: <TAccount>{
				[this.accountIdColumn]: data.accountId,
			},
		});

		// Check token exists
		const tokenRecord = await this.magicTokenRepo.findOne({
			where: {
				account_id: data.accountId,
				token: credentials.token,
				type: credentials.type,
			},
		});

		if (!tokenRecord) {
			throw new Error('Token is invalid or expired.');
		}

		// Delete token
		await this.magicTokenRepo.delete({
			where: { id: tokenRecord.id },
		});

		return account;
	}
}
