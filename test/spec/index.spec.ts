import 'jasmine';
import { clearDatabases } from '../database';
import { maindb } from '../../database/main';

beforeAll(async () => {
	console.log('Initializing main test database...');
	await maindb.init();
	console.log('Main test database initialized.');
	//await clearDatabases();
	//await testdb.init();
});

afterAll(async () => {
	await maindb.disconnect();
	//await testdb.disconnect();
});
