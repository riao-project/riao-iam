import { ColumnOptions, ColumnType, Migration } from '@riao/dbal';
import { BigIntKeyColumn } from '@riao/dbal/column-pack';

export class CreateUserRolesTable extends Migration {
	public tableName = 'riao_user_roles';
	public columns: ColumnOptions[] = [
		BigIntKeyColumn,
		{
			name: 'role_id',
			type: ColumnType.INT,
			required: true,
			fk: {
				referencesTable: 'riao_roles',
				referencesColumn: 'id',
			},
		},
		{
			name: 'user_id',
			type: ColumnType.BIGINT,
			required: true,
			fk: {
				referencesTable: 'users',
				referencesColumn: 'id',
			},
		},
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
