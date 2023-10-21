import 'jasmine';
import * as index from '../../src';
import { maindb } from '../../database/main';

beforeAll(async () => {
	await maindb.init();
});
afterAll(async () => {
	await maindb.disconnect();
});

describe('riao-iam', () => {
	it('exports a', () => {
		expect(index.a).toBeTrue();
	});
});
