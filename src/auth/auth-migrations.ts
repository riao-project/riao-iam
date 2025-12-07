import { Migration, MigrationPackage } from '@riao/dbal';
// eslint-disable-next-line max-len
import { CreatePrincipalsTableMigration } from './migrations/001-create-principals-table';

export class AuthMigrations extends MigrationPackage {
	override name = '@riao/iam';
	override package = '@riao/iam';

	public async getMigrations(): Promise<
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		Record<string, typeof Migration<any>>
		> {
		return { 'create-principals-table': CreatePrincipalsTableMigration };
	}
}
