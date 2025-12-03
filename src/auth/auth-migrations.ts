import { Migration } from '@riao/dbal';
import { CreateAccountsTableMigration } from './migrations/001-create-accounts-table';

export class AuthMigrations {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public getMigrations(): Record<string, typeof Migration<any>> {
		return { 'create-accounts-table': CreateAccountsTableMigration };
	}
}
