import 'jasmine';
import { maindb } from '../../database/main';
import { ColumnType } from '@riao/dbal';
import { AuthenticationPassword } from '../../src/authentication-password';
import { AuthenticationError } from '../../src/errors/authentication-error';
import { createUsersTable } from 'test/create-test-users-table';

describe('Authentication - Password', () => {
	const authz = new AuthenticationPassword({
		db: maindb,
		userTable: 'authn_password_users',
	});

	beforeAll(async () => {
		await createUsersTable('authn_password_users');

		await maindb.query.insertOne({
			table: 'authn_password_users',
			record: {
				email: 'test@example.com',
				password: await authz.hashPassword('password1234'),
			},
			primaryKey: 'id',
		});
	});

	it('can login', async () => {
		await authz.login({
			login: 'test@example.com',
			password: 'password1234',
		});
	});

	it('can reject wrong password', async () => {
		await expectAsync(
			authz.login({
				login: 'test@example.com',
				password: 'password1235',
			})
		).toBeRejectedWithError(AuthenticationError, 'Wrong password');
	});

	it('can reject wrong email', async () => {
		await expectAsync(
			authz.login({
				login: 'fail@example.com',
				password: 'password1234',
			})
		).toBeRejectedWithError(
			AuthenticationError,
			'Could not find active user'
		);
	});
});
