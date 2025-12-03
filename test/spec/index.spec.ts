import 'jasmine';
import { maindb } from '../../database/main';

beforeAll(async () => {
	await maindb.init();
	//await clearDatabases();
	//await testdb.init();
});

afterAll(async () => {
	await maindb.disconnect();
	//await testdb.disconnect();
});
