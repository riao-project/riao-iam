import 'jasmine';
import { db } from '../../database';

describe('AuthBase', () => {
	it('should create principal table', async () => {
		const tables = (await db.getSchema()).tables;
		const hasTable = Object.keys(tables).includes('iam_principals');
		expect(hasTable).toBe(true);
	});
});
