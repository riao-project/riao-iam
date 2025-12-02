import {
	Database,
	DatabaseRecord,
	Migration,
	QueryRepository,
} from '@riao/dbal';
import { CreateAccountsTableMigration } from './migrations/001-create-accounts-table';

export interface AuthOptions<TAccount extends DatabaseRecord> {
	repo: QueryRepository<TAccount>;
}

export abstract class Auth<TAccount extends DatabaseRecord> {
	protected accountRepo: QueryRepository<TAccount>;
	protected accountTable = 'accounts';
	protected accountIdColumn = 'id';
	protected loginColumn = 'login';

	public constructor(options: AuthOptions<TAccount>) {
		this.accountRepo = options.repo;
	}

	public getMigrations(db: Database): Record<string, Migration> {
		return {
			'001-create-accounts-table': new CreateAccountsTableMigration(db, {
				table: this.accountTable,
				accountIdColumn: this.accountIdColumn,
				loginColumn: this.loginColumn,
			}),
		};
	}
}
