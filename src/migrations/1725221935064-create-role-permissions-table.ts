import { ColumnOptions, ColumnType, Migration } from '@riao/dbal';
import { BigIntKeyColumn, IntKeyColumn } from '@riao/dbal/column-pack';

export class CreateRolePermissionsTable extends Migration {
	public tableName = 'riao_role_permissions';
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
			name: 'permission_id',
			type: ColumnType.INT,
			required: true,
			fk: {
				referencesTable: 'riao_permissions',
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
