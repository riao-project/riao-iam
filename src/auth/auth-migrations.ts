import { Migration } from '@riao/dbal';
// eslint-disable-next-line max-len
import { CreatePrincipalsTableMigration } from './migrations/001-create-principals-table';

export class AuthMigrations {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public getMigrations(): Record<string, typeof Migration<any>> {
		return { 'create-principals-table': CreatePrincipalsTableMigration };
	}
}
