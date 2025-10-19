import 'jasmine';

import { createDatabase, runMigrations } from '../../database';
import { Principal } from '../../principal';
import { Token } from '../../../src/jwt';
import { KeyPairGenerator } from '../../../src/keypair';
import { MagicTokenAuthentication } from '../../../src/authentication/authentication-magic-token';

describe('Authentication - Magic Token', () => {
	const db = createDatabase('authentication-magic-token');
	const repo = db.getQueryRepository<Principal>({
		table: 'principals',
		identifiedBy: 'id',
	});

	const keypair = new KeyPairGenerator({ algorithm: 'ES512' }).generate();

	const auth = new (class extends MagicTokenAuthentication<Principal> {
		protected override principalRepo = repo;
	})({
		jwtOptions: {
			publicKey: keypair.publicKey,
			privateKey: keypair.privateKey,
			algorithm: 'ES512',
		},
	});

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, auth);

		await auth.createPrincipal({
			principal_name: 'auth-passwordless@example.com',
		});
	});

	afterAll(async () => {
		await db.disconnect();
	});

	it('can login', async () => {
		const email = 'auth-passwordless@example.com';
		const token = await auth.createMagicToken({ principal_name: email });

		// Wait a second to avoid not-before-time exception
		await new Promise((a, r) => setTimeout(a, 1000));

		const authenticated = await auth.authenticate({ token: token.token });

		expect(authenticated).not.toBeNull();
		expect(authenticated!.principal_name).toEqual(email);
	});

	it('can reject wrong email', async () => {
		const email = 'not_a_user@example.com';
		await expectAsync(
			auth.createMagicToken({ principal_name: email })
		).toBeRejectedWithError('Principal not found or not active.');
	});

	it('can reject wrong token', async () => {
		const email = 'auth-passwordless@example.com';
		const tokenObj: Token = await auth.createMagicToken({
			principal_name: email,
		});

		// Simulate a bad token by changing one letter to a 9
		const token: string = tokenObj.token.replace(/[a-z]/, '9');

		// Wait a second to avoid not-before-time exception
		await new Promise((a, r) => setTimeout(a, 1000));

		await expectAsync(auth.authenticate({ token })).toBeRejected();
	});
});
