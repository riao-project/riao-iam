import { Migration } from '@riao/dbal';
import { IntKeyColumn, NameColumn } from '@riao/dbal/column-pack';

export class CreatePermissionsTable extends Migration {
	public tableName = 'riao_permissions';
	public columns = [
		IntKeyColumn,
		NameColumn,
		{ ...NameColumn, name: 'action', required: true },
		{ ...NameColumn, name: 'model', required: false },
	];

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
