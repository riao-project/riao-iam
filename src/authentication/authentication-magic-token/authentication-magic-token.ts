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

export class MagicTokenAuthentication<
	TPrincipal extends Principal = Principal,
> extends AuthenticationBase<TPrincipal> {
	protected jwt: Jwt<MagicTokenPayload>;
	protected magicTokenColumn = 'magic_token';

	public constructor(options: { jwtOptions: JwtOptions }) {
		super();
		this.jwt = new Jwt(options.jwtOptions);
	}

	public async createMagicToken(
		credentials: { principal_name: string },
		options: TokenOptions = defaultTokenOptions
	): Promise<Token> {
		const principal = await this.findActivePrincipal({
			where: <any>{ [this.principalColumn]: credentials.principal_name },
		});

		if (principal === null) {
			throw new Error('Principal not found or not active.');
		}

		const principalId = <string>(
			principal[this.principalColumn as keyof TPrincipal]
		);

		// Generate & return token
		return await this.jwt.generateToken(
			{
				type: 'magic-token',
				principalId: principalId,
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
			where: <any>{ [this.principalColumn]: data.principalId },
		});

		return principal;
	}

	public override getMigrations(db: Database): Record<string, Migration> {
		return {
			...super.getMigrations(db),
			'01-create-magic-token-table': new CreateMagicTokenTable(db, {
				tableName: this.principalRepo.getTableName() ?? 'principals',
				magicTokenColumnName: this.magicTokenColumn,
			}),
		};
	}
}
