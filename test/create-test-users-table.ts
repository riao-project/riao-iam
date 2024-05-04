import { ColumnType } from '@riao/dbal';
import { maindb } from '../database/main';

export async function createUsersTable(tableName: string) {
	await maindb.ddl.dropTable({
		tables: [tableName],
		ifExists: true,
	});

	await maindb.ddl.createTable({
		name: tableName,
		columns: [
			{
				name: 'id',
				type: ColumnType.BIGINT,
				primaryKey: true,
				autoIncrement: true,
			},
			{
				name: 'email',
				type: ColumnType.VARCHAR,
				length: 1024,
				required: true,
			},
			{
				name: 'password',
				type: ColumnType.VARCHAR,
				length: 1024,
				required: true,
			},
		],
	});
}
