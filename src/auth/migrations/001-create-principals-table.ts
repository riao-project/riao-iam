import {
	CreateTimestampColumn,
	NameColumn,
	UsernameColumn,
	UUIDKeyColumn,
} from '@riao/dbal/column-pack';
import { ColumnType, Migration } from '@riao/dbal';

export class CreatePrincipalsTableMigration extends Migration {
	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: 'iam_principals',
			columns: [
				UUIDKeyColumn,
				{
					name: 'type',
					type: ColumnType.VARCHAR,
					length: 255,
					required: true,
				},
				{
					...UsernameColumn,
					length: 255,
					name: 'login',
					required: true,
				},
				{ ...NameColumn, required: true },
				CreateTimestampColumn,
				{
					name: 'deactivate_timestamp',
					type: ColumnType.TIMESTAMP,
				},
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({
			tables: ['iam_principals'],
		});
	}
}
