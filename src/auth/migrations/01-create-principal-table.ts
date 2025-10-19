import { Database } from '@riao/dbal';
import {
	BigIntKeyColumn,
	NameColumn,
	CreateTimestampColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export interface PrincipalTableOptions {
	table: string;
	principalIdColumn: string;
	loginColumn: string;
}

export class CreatePrincipalTableMigration extends Migration {
	protected override options: PrincipalTableOptions = {
		table: 'principals',
		principalIdColumn: 'id',
		loginColumn: 'login',
	};

	public constructor(db: Database, options: PrincipalTableOptions) {
		super(db, options);
		this.options = options;
	}

	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: this.options.table,
			columns: [
				{
					...BigIntKeyColumn,
					name: this.options.principalIdColumn,
				},
				{
					...NameColumn,
					name: this.options.loginColumn,
				},
				{ ...CreateTimestampColumn },
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({
			tables: [this.options.table],
		});
	}
}
