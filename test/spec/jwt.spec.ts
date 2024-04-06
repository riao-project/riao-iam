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

		const data: { test: boolean } = await jwt.decodeToken(token);

		expect(data.test).toEqual(true);
	});

	it('can use keypair from files', async () => {
		const keys = new KeyPairGenerator({ algorithm: 'ES512' }).load({
			publicKeyPath: 'ecdsa-p521-public.pem',
			privateKeyPath: 'ecdsa-p521-private.pem',
		});

		const jwt = new Jwt<{ test: boolean }>(keys);
		const token = await jwt.generateToken({ test: true });

		await new Promise((a, r) => setTimeout(a, 1000));

		const data: { test: boolean } = await jwt.decodeToken(token);

		expect(data.test).toEqual(true);
	});

	it('can use keypair from memory', async () => {
		const keys = new KeyPairGenerator({ algorithm: 'ES512' }).generate();

		const jwt = new Jwt<{ test: boolean }>(keys);
		const token = await jwt.generateToken({ test: true });

		await new Promise((a, r) => setTimeout(a, 1000));

		const data: { test: boolean } = await jwt.decodeToken(token);

		expect(data.test).toEqual(true);
	});
});
