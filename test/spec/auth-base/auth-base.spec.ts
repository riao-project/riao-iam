import 'jasmine';
import { Auth } from '../../../src/auth';
import { Account } from '../../account';
import { createDatabase, runMigrations } from '../../database';

describe('AuthBase', () => {
	const db = createDatabase('auth-base');
	const repo = db.getQueryRepository<Account>({
		table: 'accounts',
		identifiedBy: 'id',
	});

	const auth = new (class extends Auth<Account> {
		protected override accountRepo = repo;
	})({ repo });

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, auth);
	});

	it('should create account table', async () => {
		const tables = (await db.getSchema()).tables;
		const hasTable = Object.keys(tables).includes('accounts');
		expect(hasTable).toBe(true);
	});
});
