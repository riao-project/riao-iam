import { AuthenticationBase } from '../authentication-base';
import { Token, Jwt, JwtOptions } from '../../jwt';
import {
	defaultTokenOptions,
	MagicTokenPayload,
	MagicTokenRecord,
	TokenOptions,
} from './magic-token';
import { Principal } from '../../../test/principal';
import { Database, Migration, QueryRepository } from '@riao/dbal';
import { CreateMagicTokenTable } from './migrations/01-create-magic-token-table';
import { AuthOptions } from '../../auth/auth';

export interface MagicTokenAuthenticationOptions<TPrincipal extends Principal>
	extends AuthOptions<TPrincipal> {
	jwtOptions: JwtOptions;
}

export class MagicTokenAuthentication<
	TPrincipal extends Principal = Principal,
> extends AuthenticationBase<TPrincipal> {
	protected jwt: Jwt<MagicTokenPayload>;
	protected magicTokenTable = 'magic_tokens';
	protected tokenColumn = 'token';
	protected magicTokenRepo: QueryRepository<MagicTokenRecord>;

	public constructor(options: MagicTokenAuthenticationOptions<TPrincipal>) {
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
		const principal = await this.findActivePrincipal({
			where: <any>{
				[this.loginColumn]: credentials.login,
			},
		});

		if (principal === null) {
			throw new Error('Principal not found or not active.');
		}

		const principalId = principal[this.principalIdColumn];

		// Generate token
		const token = await this.jwt.generateToken(
			{
				type: 'magic-token',
				principalId: principal[this.principalIdColumn],
			},
			{
				expiresIn: options.expiresIn,
			}
		);

		await this.magicTokenRepo.insertOne({
			record: {
				principal_id: principalId,
				token: token.token,
				type: options.type,
			},
		});

		return token;
	}

	public async authenticate(credentials: {
		token: string;
		type: string;
	}): Promise<TPrincipal | null> {
		// Verify magic token
		const data = await this.jwt.decodeToken(credentials.token);

		if (data.type !== 'magic-token') {
			throw new Error('Wrong type of token provided for this operation.');
		}

		// Check principal
		const principal = await this.findActivePrincipal({
			where: <TPrincipal>{
				[this.principalIdColumn]: data.principalId,
			},
		});

		// Check token exists
		const tokenRecord = await this.magicTokenRepo.findOne({
			where: {
				principal_id: data.principalId,
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

		return principal;
	}

	public override getMigrations(db: Database): Record<string, Migration> {
		return {
			...super.getMigrations(db),
			'01-create-magic-token-table': new CreateMagicTokenTable(db, {
				table: this.magicTokenTable,
				tokenColumn: this.tokenColumn,
				principalTable: this.principalTable,
				principalIdColumn: this.principalIdColumn,
			}),
		};
	}
}
