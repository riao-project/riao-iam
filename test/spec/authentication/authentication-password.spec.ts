import { PasswordAuthentication } from '../../../src/authentication/authentication-password';
import { createDatabase, runMigrations } from '../../database';
import { Account } from '../../account';
import { compare } from 'bcrypt';
import { AuthenticationPasswordMigrations } from '../../../src/authentication/authentication-password/authentication-password-migrations';

interface PasswordAccount extends Account {
	password: string;
}

describe('Authentication - Password', () => {
	const db = createDatabase('authentication-password');
	const repo = db.getQueryRepository<PasswordAccount>({
		table: 'iam_accounts',
		identifiedBy: 'id',
	});

	const auth = new (class extends PasswordAuthentication<PasswordAccount> {
		protected override accountRepo = repo;
	})({ repo });

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, new AuthenticationPasswordMigrations());
	});

	afterAll(async () => {
		await db.disconnect();
	});

	it('should create a account with a hashed password', async () => {
		const id = await auth.createAccount({
			login: 'create_account_test',
			password: 'password123',
		});

		const account = await repo.findOne({ where: { id } });

		if (!account) {
			throw new Error('Account not found');
		}

		expect(account.id).toEqual(id);
		expect(await compare('password123', account.password)).toEqual(true);
	});

	it('should authenticate a account with correct credentials', async () => {
		await auth.createAccount({
			login: 'correct_test',
			password: 'password123',
		});

		const authenticated = await auth.authenticate({
			login: 'correct_test',
			password: 'password123',
		});

		if (authenticated === null) {
			throw new Error('Authentication failed');
		}

		expect((authenticated.id as string).length).toBeGreaterThanOrEqual(1);
		expect(authenticated.login).toEqual('correct_test');
	});

	it('should fail authentication with incorrect credentials', async () => {
		await auth.createAccount({
			login: 'incorrect_test',
			password: 'password123',
		});

		const authenticated = await auth.authenticate({
			login: 'incorrect_test',
			password: 'wrongpassword',
		});

		expect(authenticated).toBeNull();
	});
});
