import { Migration } from '@riao/dbal';
import { IntKeyColumn, NameColumn } from '@riao/dbal/column-pack';

export class CreateRolesTable extends Migration {
	public tableName = 'riao_roles';
	public columns = [IntKeyColumn, NameColumn];

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
