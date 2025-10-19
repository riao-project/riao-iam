import { AuthenticationBase } from '../authentication-base';
import { Token, Jwt, JwtOptions } from '../../jwt';
import {
	defaultTokenOptions,
	MagicTokenPayload,
	TokenOptions,
} from './magic-token';
import { Principal } from '../../../test/principal';
import { Database, Migration } from '@riao/dbal';
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

	public constructor(options: MagicTokenAuthenticationOptions<TPrincipal>) {
		super(options);
		this.jwt = new Jwt(options.jwtOptions);
	}

	public async createMagicToken(
		credentials: { login: string },
		options: TokenOptions = defaultTokenOptions
	): Promise<Token> {
		const principal = await this.findActivePrincipal({
			where: <any>{
				[this.loginColumn]: credentials.login,
			},
		});

		if (principal === null) {
			throw new Error('Principal not found or not active.');
		}

		// Generate & return token
		return await this.jwt.generateToken(
			{
				type: 'magic-token',
				principalId: principal[this.principalIdColumn],
			},
			{
				expiresIn: options.expiresIn,
			}
		);
	}

	public async authenticate(credentials: {
		token: string;
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
