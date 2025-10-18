import { Database } from '@riao/dbal';
import {
	BigIntKeyColumn,
	NameColumn,
	CreateTimestampColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

interface CreatePrincipalTableMigrationOptions {
	tableName?: string;
	primaryKeyColumnName?: string;
	principalColumnName?: string;
}

export class CreatePrincipalTableMigration extends Migration {
	protected override options: CreatePrincipalTableMigrationOptions = {
		tableName: 'principals',
		primaryKeyColumnName: 'id',
		principalColumnName: 'principal_name',
	};

	public constructor(
		db: Database,
		options: CreatePrincipalTableMigrationOptions
	) {
		super(db, options);
	}

	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: this.options.tableName!,
			columns: [
				{
					...BigIntKeyColumn,
					name: this.options.primaryKeyColumnName!,
				},
				{
					...NameColumn,
					name: this.options.principalColumnName!,
				},
				{ ...CreateTimestampColumn },
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({
			tables: [this.options.tableName!],
		});
	}
}
