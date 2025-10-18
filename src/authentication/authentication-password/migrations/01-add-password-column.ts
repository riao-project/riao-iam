import { Database } from '@riao/dbal';
import { PasswordColumn } from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

interface AddPasswordColumnOptions {
	tableName?: string;
	passwordColumnName?: string;
}

export class AddPasswordColumn extends Migration {
	protected override options: AddPasswordColumnOptions = {
		tableName: 'principals',
		passwordColumnName: 'password',
	};

	public constructor(db: Database, options: AddPasswordColumnOptions) {
		super(db, options);
	}

	override async up(): Promise<void> {
		await this.ddl.addColumns({
			table: this.options.tableName!,
			columns: [
				{ ...PasswordColumn, name: this.options.passwordColumnName! },
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropColumn({
			table: this.options.tableName!,
			column: this.options.passwordColumnName!,
		});
	}
}
