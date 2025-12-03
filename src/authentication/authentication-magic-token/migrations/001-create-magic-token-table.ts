import { ColumnType } from '@riao/dbal';
import {
	CreateTimestampColumn,
	PasswordColumn,
	UUIDKeyColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export class CreateMagicTokenTable extends Migration {
	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: 'iam_magic_tokens',
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
					name: 'account_id',
					type: ColumnType.UUID,
					required: true,
					fk: {
						referencesTable: 'iam_accounts',
						referencesColumn: 'id',
						onDelete: 'CASCADE',
					},
				},
				{
					name: 'token',
					type: ColumnType.VARCHAR,
					length: 1024,
					required: true,
				},
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({ tables: ['iam_magic_tokens'] });
	}
}
