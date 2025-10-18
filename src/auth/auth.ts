import {
	Database,
	DatabaseRecord,
	Migration,
	QueryRepository,
} from '@riao/dbal';
import { CreatePrincipalTableMigration } from './migrations/01-create-principal-table';

export abstract class Auth<TPrincipal extends DatabaseRecord> {
	protected principalColumn = 'principal_name';
	protected principalRepo: QueryRepository<TPrincipal>;

	public getMigrations(db: Database): Record<string, Migration> {
		return {
			'01-create-principal-table': new CreatePrincipalTableMigration(db, {
				tableName: this.principalRepo.getTableName() ?? undefined,
				primaryKeyColumnName:
					this.principalRepo.getIdentifier() ?? 'id',
				principalColumnName: this.principalColumn,
			}),
		};
	}
}
