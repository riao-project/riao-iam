import { DatabaseRecordId, MigrationRunner, QueryRepository } from '@riao/dbal';
import { testdb } from '../../../database/test';
import { Auth } from '../../../src/auth';

interface Principal {
	id: DatabaseRecordId;
	principal_name: string;
}

const principalsRepo = testdb.getQueryRepository<Principal>({
	table: 'principals',
	identifiedBy: 'id',
});

class TestAuth extends Auth<any> {
	protected override principalRepo: QueryRepository<Principal> =
		principalsRepo;
}

describe('AuthBase', () => {
	const auth = new TestAuth();

	beforeAll(async () => {
		const runner = new MigrationRunner(testdb);
		const migrations = auth.getMigrations(testdb);
		await runner.run(migrations);
	});

	it('should create principal table', async () => {
		const tables = (await testdb.getSchema()).tables;
		const hasTable = Object.keys(tables).includes('principals');
		expect(hasTable).toBe(true);
	});
});
