import { ColumnType, Database } from '@riao/dbal';
import {
	BigIntKeyColumn,
	CreateTimestampColumn,
	PasswordColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

interface CreateMagicTokenTableOptions {
	table?: string;
	tokenColumn?: string;
	accountTable?: string;
	accountIdColumn?: string;
}

export class CreateMagicTokenTable extends Migration {
	protected override options: CreateMagicTokenTableOptions = {
		table: 'magic_tokens',
		tokenColumn: 'token',
		accountTable: 'accounts',
		accountIdColumn: 'id',
	};

	public constructor(db: Database, options: CreateMagicTokenTableOptions) {
		super(db, options);
	}

	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: this.options.table!,
			columns: [
				BigIntKeyColumn,
				CreateTimestampColumn,
				{
					name: 'type',
					type: ColumnType.VARCHAR,
					length: 255,
					required: true,
				},
				{
					name: 'account_id',
					type: ColumnType.VARCHAR,
					length: 255,
					required: true,
					fk: {
						referencesTable: this.options.accountTable!,
						referencesColumn: this.options.accountIdColumn!,
						onDelete: 'CASCADE',
					},
				},
				{
					...PasswordColumn,
					name: this.options.tokenColumn!,
				},
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({ tables: this.options.table! });
	}
}
