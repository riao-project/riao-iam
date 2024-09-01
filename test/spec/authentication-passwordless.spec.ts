import 'jasmine';
import { maindb } from '../../database/main';
import { ColumnType } from '@riao/dbal';
import { AuthenticationPasswordless } from '../../src/authentication-passwordless';
import { AuthenticationError } from '../../src/errors/authentication-error';

import { readFileSync } from 'fs';
import { createPrivateKey, createPublicKey } from 'crypto';
import { Token } from '../../src/jwt';
import { CreateUsersTable } from '../../src/migrations';

describe('Authentication - Passwordless', () => {
	const publicKey = readFileSync('ecdsa-p521-public.pem').toString();
	const privateKey = readFileSync('ecdsa-p521-private.pem').toString();

	const authn = new AuthenticationPasswordless({
		db: maindb,
		userTable: 'authn_passwordless_users',
		loginColumn: 'email',
		jwt: {
			publicKey: createPublicKey(publicKey),
			privateKey: createPrivateKey(privateKey),
			algorithm: 'ES512',
		},
	});

	beforeAll(async () => {
		await maindb.ddl.dropTable({
			tables: ['authn_passwordless_users'],
			ifExists: true,
		});

		const table = new CreateUsersTable(maindb);
		table.tableName = 'authn_passwordless_users';

		await table.up();

		await maindb.query.insertOne({
			table: table.tableName,
			record: {
				email: 'authn-passwordless@example.com',
			},
			primaryKey: 'id',
		});
	});

	it('can login', async () => {
		const login = 'authn-passwordless@example.com';
		const token = await authn.getMagicToken({ login });

		// Wait a second to avoid not-before-time exception
		await new Promise((a, r) => setTimeout(a, 1000));

		await authn.login({ token: token.token });
	});

	it('can reject wrong email', async () => {
		const login = 'not_a_user@example.com';
		await expectAsync(authn.getMagicToken({ login })).toBeRejectedWithError(
			AuthenticationError,
			'Could not find active user'
		);
	});

	it('can reject wrong token', async () => {
		const login = 'authn-passwordless@example.com';
		const tokenObj: Token = await authn.getMagicToken({ login });
		const token: string = tokenObj.token.replace(/[a-z]/, '9'); // Simulate a bad token by changing one letter to a 9

		// Wait a second to avoid not-before-time exception
		await new Promise((a, r) => setTimeout(a, 1000));

		await expectAsync(authn.login({ token })).toBeRejected();
	});
});
