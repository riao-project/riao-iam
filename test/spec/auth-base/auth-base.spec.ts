import 'jasmine';
import { Auth } from '../../../src/auth';
import { Principal } from '../../principal';
import { createDatabase, runMigrations } from '../../database';

describe('AuthBase', () => {
	const db = createDatabase('auth-base');
	const repo = db.getQueryRepository<Principal>({
		table: 'principals',
		identifiedBy: 'id',
	});

	const auth = new (class extends Auth<Principal> {
		protected override principalRepo = repo;
	})({ repo });

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, auth);
	});

	it('should create principal table', async () => {
		const tables = (await db.getSchema()).tables;
		const hasTable = Object.keys(tables).includes('principals');
		expect(hasTable).toBe(true);
	});
});
