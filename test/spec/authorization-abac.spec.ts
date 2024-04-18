import 'jasmine';
import { maindb } from '../../database/main';
import { ColumnType, DatabaseRecord } from '@riao/dbal';

import { AuthorizationLookup, CrudActions } from '../../src/authorization-base';
import { AuthorizationError } from '../../src/errors/authorization-error';
import { AttributeBasedAuthorization } from '../../src/authorization-abac';

class TestAuthorization extends AttributeBasedAuthorization {
	public async checkQuery(lookup: AuthorizationLookup): Promise<boolean> {
		const found = await this.userRepo.findOne({
			columns: ['age'],
			where: { id: lookup.userId },
		});

		return found?.age >= 18;
	}
}

describe('Authorization - Attribute Based', () => {
	const tables = {
		users: 'authz_abac_users',
		posts: 'authz_abac_posts',
	};

	const authz = new TestAuthorization({
		db: maindb,
		userTable: tables.users,
	});

	let user30: DatabaseRecord;
	let user10: DatabaseRecord;

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
				{
					name: 'age',
					type: ColumnType.SMALLINT,
					required: true,
				},
			],
		});

		await maindb.ddl.createTable({
			name: tables.posts,
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

		user30 = await maindb.query.insertOne({
			table: tables.users,
			record: { email: 'im30@example.com', age: 30 },
			primaryKey: 'id',
		});

		user10 = await maindb.query.insertOne({
			table: tables.users,
			record: { email: 'im10@example.com', age: 10 },
			primaryKey: 'id',
		});
	});

	it('30 has access', async () => {
		await authz.check({
			userId: user30.id,
			action: CrudActions.CREATE,
			model: 'post',
		});
	});

	it('10 has no access', async () => {
		await expectAsync(
			authz.check({
				userId: user10.id,
				action: CrudActions.CREATE,
				model: 'post',
			})
		).toBeRejectedWithError(AuthorizationError);
	});
});
