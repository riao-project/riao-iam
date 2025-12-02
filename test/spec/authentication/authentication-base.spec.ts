import { AuthenticationBase } from '../../../src/authentication/authentication-base';
import { createDatabase, runMigrations } from '../../database';
import { Account } from '../../account';

describe('Authentication - Base', () => {
	const db = createDatabase('authentication-base');
	const repo = db.getQueryRepository<Account>({
		table: 'accounts',
		identifiedBy: 'id',
	});

	const auth = new (class extends AuthenticationBase<Account> {
		protected override accountRepo = repo;

		public async authenticate(credentials: any): Promise<Account | null> {
			return null;
		}
	})({ repo });

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, auth);
	});

	afterAll(async () => {
		await db.disconnect();
	});

	it('should create a account with a hashed password', async () => {
		await auth.createAccount({
			login: 'create_account_test',
		});

		const account = await repo.findOne({ where: { id: '1' } });

		if (!account) {
			throw new Error('Account not found');
		}

		expect(account.id).toEqual(1);
	});

	it('can find active account', async () => {
		await auth.createAccount({
			login: 'active_account_test',
		});

		const account = await auth.findActiveAccount({
			where: { login: 'active_account_test' },
		});

		expect(account?.login).toEqual('active_account_test');
	});
});
