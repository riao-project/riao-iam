import { Database } from '@riao/dbal';
import {
	BigIntKeyColumn,
	CreateTimestampColumn,
	UsernameColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export interface AccountTableOptions {
	table: string;
	accountIdColumn: string;
	loginColumn: string;
}

export class CreateAccountsTableMigration extends Migration {
	protected override options: AccountTableOptions = {
		table: 'iam_accounts',
		accountIdColumn: 'id',
		loginColumn: 'login',
	};

	public constructor(db: Database, options: AccountTableOptions) {
		super(db, options);
		this.options = options;
	}

	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: this.options.table,
			columns: [
				{
					...BigIntKeyColumn,
					name: this.options.accountIdColumn,
				},
				{
					...UsernameColumn,
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
