import 'jasmine';
import { createDatabase, runMigrations } from '../../database';
import { AuthMigrations } from '../../../src/auth/auth-migrations';

describe('AuthBase', () => {
	const db = createDatabase('auth-base');

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, new AuthMigrations());
	});

	it('should create account table', async () => {
		const tables = (await db.getSchema()).tables;
		const hasTable = Object.keys(tables).includes('iam_accounts');
		expect(hasTable).toBe(true);
	});
});
