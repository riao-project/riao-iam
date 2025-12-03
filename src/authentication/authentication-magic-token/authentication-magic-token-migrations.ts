import { Migration } from '@riao/dbal';
import { AuthMigrations } from '../../auth/auth-migrations';
import { CreateMagicTokenTable } from './migrations/001-create-magic-token-table';

export class AuthenticationMagicTokenMigrations extends AuthMigrations {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public override getMigrations(): Record<string, typeof Migration<any>> {
		return {
			...super.getMigrations(),
			'create-magic-token-table': CreateMagicTokenTable,
		};
	}
}
