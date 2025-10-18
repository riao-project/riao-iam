import { PasswordAuthentication } from '../../../src/authentication/authentication-password';
import { createDatabase, runMigrations } from '../../database';
import { Principal } from '../../principal';
import { compare } from 'bcrypt';

interface PasswordPrincipal extends Principal {
	password: string;
}

describe('Authentication - Password', () => {
	const db = createDatabase('authentication-password');
	const repo = db.getQueryRepository<PasswordPrincipal>({
		table: 'principals',
		identifiedBy: 'id',
	});

	const auth = new (class extends PasswordAuthentication<PasswordPrincipal> {
		protected override principalRepo = repo;
	})();

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, auth);
	});

	afterAll(async () => {
		await db.disconnect();
	});

	it('should create a principal with a hashed password', async () => {
		await auth.createPrincipal({
			principal_name: 'create_principal_test',
			password: 'password123',
		});

		const principal = await repo.findOne({ where: { id: '1' } });

		if (!principal) {
			throw new Error('Principal not found');
		}

		expect(principal.id).toEqual(1);
		expect(await compare('password123', principal.password)).toEqual(true);
	});

	it('should authenticate a principal with correct credentials', async () => {
		await auth.createPrincipal({
			principal_name: 'correct_test',
			password: 'password123',
		});

		const isAuthenticated = await auth.authenticate({
			principal_name: 'correct_test',
			password: 'password123',
		});

		expect(isAuthenticated).toBe(true);
	});

	it('should fail authentication with incorrect credentials', async () => {
		await auth.createPrincipal({
			principal_name: 'incorrect_test',
			password: 'password123',
		});

		const isAuthenticated = await auth.authenticate({
			principal_name: 'incorrect_test',
			password: 'wrongpassword',
		});

		expect(isAuthenticated).toBe(false);
	});
});
