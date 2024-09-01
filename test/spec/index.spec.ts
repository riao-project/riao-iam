import 'jasmine';
import { maindb } from '../../database/main';
import {
	CreatePermissionsTable,
	CreateRolePermissionsTable,
	CreateRolesTable,
	CreateUserRolesTable,
	CreateUsersTable,
} from '../../src/migrations';
import { PasswordColumn } from '@riao/dbal/column-pack';

beforeAll(async () => {
	await maindb.init();

	await maindb.ddl.dropTable({
		tables: [
			'users',
			'riao_roles',
			'riao_permissions',
			'riao_role_permissions',
			'riao_user_roles',
		],
		ifExists: true,
	});

	const usersTable = new CreateUsersTable(maindb);
	usersTable.columns.push(PasswordColumn);
	await usersTable.up();

	await new CreateRolesTable(maindb).up();
	await new CreatePermissionsTable(maindb).up();
	await new CreateRolePermissionsTable(maindb).up();
	await new CreateUserRolesTable(maindb).up();
});
afterAll(async () => {
	await maindb.disconnect();
});
