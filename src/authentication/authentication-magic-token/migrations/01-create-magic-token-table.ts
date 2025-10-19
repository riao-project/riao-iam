import { ColumnType, Database } from '@riao/dbal';
import {
	CreateTimestampColumn,
	PasswordColumn,
	UUIDKeyColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

interface CreateMagicTokenTableOptions {
	tableName?: string;
	magicTokenColumnName?: string;
}

export class CreateMagicTokenTable extends Migration {
	protected override options: CreateMagicTokenTableOptions = {
		tableName: 'magic_tokens',
		magicTokenColumnName: 'token',
	};

	public constructor(db: Database, options: CreateMagicTokenTableOptions) {
		super(db, options);
	}

	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: this.options.tableName!,
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
						referencesTable: 'principals',
						referencesColumn: 'id',
						onDelete: 'CASCADE',
					},
				},
				{ ...PasswordColumn, name: this.options.magicTokenColumnName! },
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({ tables: this.options.tableName! });
	}
}
