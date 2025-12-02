import { Database } from '@riao/dbal';
import { PasswordColumn } from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

interface AddPasswordColumnOptions {
	table: string;
	passwordColumn: string;
}

export class AddPasswordColumn extends Migration {
	protected override options: AddPasswordColumnOptions = {
		table: 'accounts',
		passwordColumn: 'password',
	};

	public constructor(db: Database, options: AddPasswordColumnOptions) {
		super(db, options);
		this.options = { ...this.options, ...options };
	}

	override async up(): Promise<void> {
		await this.ddl.addColumns({
			table: this.options.table,
			columns: [{ ...PasswordColumn, name: this.options.passwordColumn }],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropColumn({
			table: this.options.table,
			column: this.options.passwordColumn,
		});
	}
}
