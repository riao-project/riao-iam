import 'jasmine';
import { Jwt } from '../../src/jwt';
import { KeyPairGenerator } from '../../src/keypair';

describe('JWT', () => {
	it('can use secret', async () => {
		const jwt = new Jwt<{ test: boolean }>({
			secret: 'secret-key',
			algorithm: 'HS512',
		});
		const token = await jwt.generateToken({ test: true });

		await new Promise((a, r) => setTimeout(a, 1000));

		const data: { test: boolean } = await jwt.decodeToken(token.token);

		expect(data).toEqual({ test: true });
	});

	it('can use keypair', async () => {
		const keys = new KeyPairGenerator({ algorithm: 'ES512' }).generate();

		const jwt = new Jwt<{ test: boolean }>(keys);
		const token = await jwt.generateToken({ test: true });

		// Wait 1 second to bypass nbf exception
		await new Promise((a, r) => setTimeout(a, 1000));

		const data: { test: boolean } = await jwt.decodeToken(token.token);

		expect(data).toEqual({ test: true });
	});
});
