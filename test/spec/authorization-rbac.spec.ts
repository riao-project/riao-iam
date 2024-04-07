import 'jasmine';
import { maindb } from '../../database/main';
import { ColumnType, DatabaseRecord } from '@riao/dbal';

import { RoleBasedAuthorization } from '../../src/authorization-rbac';
import { CrudActions } from '../../src/authorization-base';
import { AuthorizationError } from '../../src/errors/authorization-error';

describe('Authorization - Role Based', () => {
	const tables = {
		users: 'authz_rbac_users',
		user_roles: 'authz_rbac_user_roles',
		roles: 'authz_rbac_roles',
		role_permissions: 'authz_rbac_role_permissions',
		permissions: 'authz_rbac_permissions',
	};

	const authz = new RoleBasedAuthorization({
		db: maindb,
		userTable: tables.users,
		permissionTable: tables.permissions,
		userRoleTable: tables.user_roles,
		rolePermissionTable: tables.role_permissions,
	});

	let writer: DatabaseRecord;
	let reader: DatabaseRecord;

	beforeAll(async () => {
		await maindb.ddl.dropTable({
			tables: Object.values(tables),
			ifExists: true,
		});

		await maindb.ddl.createTable({
			name: tables.users,
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
			],
		});

		await maindb.ddl.createTable({
			name: tables.roles,
			columns: [
				{
					name: 'id',
					type: ColumnType.BIGINT,
					primaryKey: true,
					autoIncrement: true,
				},
				{
					name: 'name',
					type: ColumnType.VARCHAR,
					length: 1024,
					required: true,
				},
			],
		});

		await maindb.ddl.createTable({
			name: tables.permissions,
			columns: [
				{
					name: 'id',
					type: ColumnType.BIGINT,
					primaryKey: true,
					autoIncrement: true,
				},
				{
					name: 'name',
					type: ColumnType.VARCHAR,
					length: 1024,
					required: true,
				},
				{
					name: 'action',
					type: ColumnType.VARCHAR,
					length: 1024,
					required: true,
				},
				{
					name: 'model',
					type: ColumnType.VARCHAR,
					length: 1024,
					required: false,
				},
			],
		});

		await maindb.ddl.createTable({
			name: tables.role_permissions,
			columns: [
				{
					name: 'role_id',
					type: ColumnType.BIGINT,
				},
				{
					name: 'permission_id',
					type: ColumnType.BIGINT,
				},
			],
			foreignKeys: [
				{
					columns: ['role_id'],
					referencesTable: tables.roles,
					referencesColumns: ['id'],
				},
				{
					columns: ['permission_id'],
					referencesTable: tables.permissions,
					referencesColumns: ['id'],
				},
			],
		});

		await maindb.ddl.createTable({
			name: tables.user_roles,
			columns: [
				{
					name: 'user_id',
					type: ColumnType.BIGINT,
				},
				{
					name: 'role_id',
					type: ColumnType.BIGINT,
				},
			],
			foreignKeys: [
				{
					columns: ['user_id'],
					referencesTable: tables.users,
					referencesColumns: ['id'],
				},
				{
					columns: ['role_id'],
					referencesTable: tables.roles,
					referencesColumns: ['id'],
				},
			],
		});

		await maindb.buildSchema();

		writer = await maindb.query.insertOne({
			table: tables.users,
			record: { email: 'writer@example.com' },
			primaryKey: 'id',
		});

		reader = await maindb.query.insertOne({
			table: tables.users,
			record: { email: 'reader@example.com' },
			primaryKey: 'id',
		});

		const writePermission = await maindb.query.insertOne({
			table: tables.permissions,
			record: {
				name: 'Write',
				action: CrudActions.CREATE,
				model: 'post',
			},
			primaryKey: 'id',
		});

		const readPermission = await maindb.query.insertOne({
			table: tables.permissions,
			record: {
				name: 'Read',
				action: CrudActions.READ,
				model: 'post',
			},
			primaryKey: 'id',
		});

		const writerRole = await maindb.query.insertOne({
			table: tables.roles,
			record: { name: 'Writer' },
			primaryKey: 'id',
		});

		const readerRole = await maindb.query.insertOne({
			table: tables.roles,
			record: { name: 'Reader' },
			primaryKey: 'id',
		});

		await maindb.query.insert({
			table: tables.role_permissions,
			records: [
				{ role_id: writerRole.id, permission_id: writePermission.id },
				{ role_id: readerRole.id, permission_id: readPermission.id },
			],
		});

		await maindb.query.insert({
			table: tables.user_roles,
			records: [
				{ user_id: writer.id, role_id: writerRole.id },
				{ user_id: writer.id, role_id: readerRole.id },
				{ user_id: reader.id, role_id: readerRole.id },
			],
		});
	});

	it('a writer can create', async () => {
		await authz.check({
			user: writer.id,
			action: CrudActions.CREATE,
			model: 'post',
		});
	});

	it('a writer can read', async () => {
		await authz.check({
			user: writer.id,
			action: CrudActions.READ,
			model: 'post',
		});
	});

	it('a reader cannot create', async () => {
		await expectAsync(
			authz.check({
				user: reader.id,
				action: CrudActions.CREATE,
				model: 'post',
			})
		).toBeRejectedWithError(AuthorizationError);
	});

	it('a read can read', async () => {
		await authz.check({
			user: reader.id,
			action: CrudActions.READ,
			model: 'post',
		});
	});
});
