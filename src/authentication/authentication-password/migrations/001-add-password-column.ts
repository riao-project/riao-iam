import { PasswordColumn } from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export class AddPasswordColumn extends Migration {
	override async up(): Promise<void> {
		await this.ddl.addColumns({
			table: 'iam_accounts',
			columns: [{ ...PasswordColumn, name: 'password' }],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropColumn({
			table: 'iam_accounts',
			column: 'password',
		});
	}
}
