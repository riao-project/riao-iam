import 'jasmine';

import { createDatabase, runMigrations } from '../../database';
import { Account } from '../../account';
import { Token } from '../../../src/jwt';
import { KeyPairGenerator } from '../../../src/keypair';
import { MagicTokenAuthentication } from '../../../src/authentication/authentication-magic-token';
import { QueryRepository } from '@riao/dbal';
import { MagicTokenRecord } from '../../../src/authentication/authentication-magic-token/magic-token';

describe('Authentication - Magic Token', () => {
	const db = createDatabase('authentication-magic-token');
	const repo = db.getQueryRepository<Account>({
		table: 'accounts',
		identifiedBy: 'id',
	});
	const tokenRepo = db.getQueryRepository<MagicTokenRecord>({
		table: 'magic_tokens',
		identifiedBy: 'id',
	}) as QueryRepository<MagicTokenRecord>;

	const keypair = new KeyPairGenerator({ algorithm: 'ES512' }).generate();

	const auth = new (class extends MagicTokenAuthentication<Account> {
		protected override accountRepo = repo;
		protected override magicTokenRepo = tokenRepo;
	})({
		repo,
		jwtOptions: {
			publicKey: keypair.publicKey,
			privateKey: keypair.privateKey,
			algorithm: 'ES512',
		},
	});

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, auth);

		await auth.createAccount({
			login: 'auth-passwordless@example.com',
		});
	});

	afterAll(async () => {
		await db.disconnect();
	});

	it('can login', async () => {
		const email = 'auth-passwordless@example.com';
		const token = await auth.createMagicToken({ login: email });

		// Wait a second to avoid not-before-time exception
		await new Promise((a, r) => setTimeout(a, 1000));

		const authenticated = await auth.authenticate({
			token: token.token,
			type: 'auth',
		});

		expect(authenticated).not.toBeNull();
		expect(authenticated!.login).toEqual(email);
	});

	it('can reject wrong email', async () => {
		const email = 'not_a_user@example.com';
		await expectAsync(
			auth.createMagicToken({ login: email })
		).toBeRejectedWithError('Account not found or not active.');
	});

	it('can reject wrong token', async () => {
		const email = 'auth-passwordless@example.com';
		const tokenObj: Token = await auth.createMagicToken({
			login: email,
		});

		// Simulate a bad token by changing one letter to a 9
		const token: string = tokenObj.token.replace(/[a-z]/, '9');

		// Wait a second to avoid not-before-time exception
		await new Promise((a, r) => setTimeout(a, 1000));

		await expectAsync(
			auth.authenticate({ token, type: 'auth' })
		).toBeRejected();
	});

	it('cannot use token twice', async () => {
		const email = 'once@example.com';
		await auth.createAccount({ login: email });

		const tokenObj: Token = await auth.createMagicToken({
			login: email,
		});

		// Wait a second to avoid not-before-time exception
		await new Promise((a, r) => setTimeout(a, 1000));

		await auth.authenticate({ token: tokenObj.token, type: 'auth' });

		await expectAsync(
			auth.authenticate({ token: tokenObj.token, type: 'auth' })
		).toBeRejectedWithError('Token is invalid or expired.');
	});
});
