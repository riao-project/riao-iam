import 'jasmine';
import { maindb } from '../../database/main';

beforeAll(async () => {
	await maindb.init();
});
afterAll(async () => {
	await maindb.disconnect();
});
