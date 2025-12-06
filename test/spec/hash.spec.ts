import 'jasmine';
import { Hash } from '../../src/hash';

describe('Hash', () => {
	const hash = new Hash();

	it('can hash a password', async () => {
		const password = 'my-password';
		const hashed = await hash.make(password);

		expect(hashed).toBeTruthy();
		expect(hashed).not.toEqual(password);
	});

	it('can verify a hashed password', async () => {
		const password = 'my-password';
		const hashed = await hash.make(password);

		const isMatch = await hash.check(password, hashed);
		expect(isMatch).toBeTrue();
	});

	it('returns false when password does not match', async () => {
		const password = 'my-password';
		const hashed = await hash.make(password);

		const isMatch = await hash.check('wrong-password', hashed);
		expect(isMatch).toBeFalse();
	});

	it('can use custom rounds', async () => {
		const password = 'my-password';
		const hashed = await hash.make(password, 10);

		const isMatch = await hash.check(password, hashed);
		expect(isMatch).toBeTrue();
	});
});
