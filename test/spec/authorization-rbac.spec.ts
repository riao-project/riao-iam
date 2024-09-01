import 'jasmine';
import { maindb } from '../../database/main';
import { ColumnType, DatabaseRecord } from '@riao/dbal';

import { RoleBasedAuthorization } from '../../src/authorization-rbac';
import { CrudActions } from '../../src/authorization-base';
import { AuthorizationError } from '../../src/errors/authorization-error';

describe('Authorization - Role Based', () => {
	const tables = {
		users: 'users',
		user_roles: 'riao_user_roles',
		roles: 'riao_roles',
		role_permissions: 'riao_role_permissions',
		permissions: 'riao_permissions',
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
		writer = await maindb.query.insertOne({
			table: tables.users,
			record: { email: 'writer@example.com', password: '' },
			primaryKey: 'id',
		});

		reader = await maindb.query.insertOne({
			table: tables.users,
			record: { email: 'reader@example.com', password: '' },
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
			userId: writer.id,
			action: CrudActions.CREATE,
			model: 'post',
		});
	});

	it('a writer can read', async () => {
		await authz.check({
			userId: writer.id,
			action: CrudActions.READ,
			model: 'post',
		});
	});

	it('a reader cannot create', async () => {
		await expectAsync(
			authz.check({
				userId: reader.id,
				action: CrudActions.CREATE,
				model: 'post',
			})
		).toBeRejectedWithError(AuthorizationError);
	});

	it('a read can read', async () => {
		await authz.check({
			userId: reader.id,
			action: CrudActions.READ,
			model: 'post',
		});
	});
});
