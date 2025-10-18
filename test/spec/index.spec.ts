import 'jasmine';
import { testdb } from '../../database/test';
import { clearDatabases } from '../database';

beforeAll(async () => {
	await clearDatabases();
	await testdb.init();
});

afterAll(async () => {
	await testdb.disconnect();
});
