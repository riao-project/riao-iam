import { Migration } from '@riao/dbal';
import {
	BigIntKeyColumn,
	EmailColumn,
	PasswordColumn,
} from '@riao/dbal/column-pack';

export class CreateUsersTable extends Migration {
	public tableName = 'users';
	public columns = [BigIntKeyColumn, EmailColumn];

	async up() {
		await this.ddl.createTable({
			name: this.tableName,
			columns: this.columns,
		});
	}

	async down() {
		await this.ddl.dropTable({ tables: this.tableName });
	}
}
