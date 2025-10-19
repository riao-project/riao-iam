import { ColumnType, Database } from '@riao/dbal';
import {
	CreateTimestampColumn,
	PasswordColumn,
	UUIDKeyColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

interface CreateMagicTokenTableOptions {
	table?: string;
	tokenColumn?: string;
	principalTable?: string;
	principalIdColumn?: string;
}

export class CreateMagicTokenTable extends Migration {
	protected override options: CreateMagicTokenTableOptions = {
		table: 'magic_tokens',
		tokenColumn: 'token',
		principalTable: 'principals',
		principalIdColumn: 'id',
	};

	public constructor(db: Database, options: CreateMagicTokenTableOptions) {
		super(db, options);
	}

	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: this.options.table!,
			columns: [
				UUIDKeyColumn,
				CreateTimestampColumn,
				{
					name: 'type',
					type: ColumnType.VARCHAR,
					length: 255,
					required: true,
				},
				{
					name: 'principal_id',
					type: ColumnType.VARCHAR,
					length: 255,
					required: true,
					fk: {
						referencesTable: this.options.principalTable!,
						referencesColumn: this.options.principalIdColumn!,
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
