import {
	Database,
	DatabaseRecord,
	Migration,
	QueryRepository,
} from '@riao/dbal';
import { CreatePrincipalTableMigration } from './migrations/01-create-principal-table';

export interface AuthOptions<TPrincipal extends DatabaseRecord> {
	repo: QueryRepository<TPrincipal>;
}

export abstract class Auth<TPrincipal extends DatabaseRecord> {
	protected principalRepo: QueryRepository<TPrincipal>;
	protected principalTable = 'principals';
	protected principalIdColumn = 'id';
	protected loginColumn = 'login';

	public constructor(options: AuthOptions<TPrincipal>) {
		this.principalRepo = options.repo;
	}

	public getMigrations(db: Database): Record<string, Migration> {
		return {
			'01-create-principal-table': new CreatePrincipalTableMigration(db, {
				table: this.principalTable,
				principalIdColumn: this.principalIdColumn,
				loginColumn: this.loginColumn,
			}),
		};
	}
}
