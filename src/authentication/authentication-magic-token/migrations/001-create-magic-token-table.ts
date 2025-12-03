import { ColumnType } from '@riao/dbal';
import {
	BigIntKeyColumn,
	CreateTimestampColumn,
	PasswordColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export class CreateMagicTokenTable extends Migration {
	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: 'iam_magic_tokens',
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
						referencesTable: 'iam_accounts',
						referencesColumn: 'id',
						onDelete: 'CASCADE',
					},
				},
				{
					...PasswordColumn,
					name: 'token',
				},
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({ tables: ['iam_magic_tokens'] });
	}
}
