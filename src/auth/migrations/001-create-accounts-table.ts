import {
	CreateTimestampColumn,
	UsernameColumn,
	UUIDKeyColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export class CreateAccountsTableMigration extends Migration {
	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: 'iam_accounts',
			columns: [
				UUIDKeyColumn,
				{
					...UsernameColumn,
					name: 'login',
				},
				CreateTimestampColumn,
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({
			tables: ['iam_accounts'],
		});
	}
}
