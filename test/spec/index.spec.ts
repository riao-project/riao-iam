import 'jasmine';
import { testdb } from '../../database/test';

beforeAll(async () => {
	await testdb.init();
});

afterAll(async () => {
	await testdb.disconnect();
});
