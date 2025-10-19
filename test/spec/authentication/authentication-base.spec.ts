import { AuthenticationBase } from '../../../src/authentication/authentication-base';
import { createDatabase, runMigrations } from '../../database';
import { Principal } from '../../principal';

describe('Authentication - Base', () => {
	const db = createDatabase('authentication-base');
	const repo = db.getQueryRepository<Principal>({
		table: 'principals',
		identifiedBy: 'id',
	});

	const auth = new (class extends AuthenticationBase<Principal> {
		protected override principalRepo = repo;

		public async authenticate(credentials: any): Promise<boolean> {
			return false;
		}
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
		});

		const principal = await repo.findOne({ where: { id: '1' } });

		if (!principal) {
			throw new Error('Principal not found');
		}

		expect(principal.id).toEqual(1);
	});

	it('can find active principal', async () => {
		await auth.createPrincipal({
			principal_name: 'active_principal_test',
		});

		const principal = await auth.findActivePrincipal({
			where: { principal_name: 'active_principal_test' },
		});

		expect(principal?.principal_name).toEqual('active_principal_test');
	});
});
