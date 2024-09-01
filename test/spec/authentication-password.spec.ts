import 'jasmine';
import { maindb } from '../../database/main';
import { AuthenticationPassword } from '../../src/authentication-password';
import { AuthenticationError } from '../../src/errors/authentication-error';

describe('Authentication - Password', () => {
	const authn = new AuthenticationPassword({
		db: maindb,
		userTable: 'users',
		loginColumn: 'email',
	});

	beforeAll(async () => {
		await maindb.query.insertOne({
			table: 'users',
			record: {
				email: 'authn-password@example.com',
				password: await authn.hashPassword('password1234'),
			},
			primaryKey: 'id',
		});
	});

	it('can login', async () => {
		await authn.login({
			login: 'authn-password@example.com',
			password: 'password1234',
		});
	});

	it('can reject wrong password', async () => {
		await expectAsync(
			authn.login({
				login: 'authn-password@example.com',
				password: 'password1235',
			})
		).toBeRejectedWithError(AuthenticationError, 'Wrong password');
	});

	it('can reject wrong email', async () => {
		await expectAsync(
			authn.login({
				login: 'fail@example.com',
				password: 'password1234',
			})
		).toBeRejectedWithError(
			AuthenticationError,
			'Could not find active user'
		);
	});
});
