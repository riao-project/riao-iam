import { Authentication } from '../../../src/authentication';
import { Principal } from '../../../src/auth';
import { QueryRepository, Expression } from '@riao/dbal';
import { db } from '../../database';
import {
	AuthenticationAttempt,
	AuthenticationProtection,
	AuthenticationProtectionResult,
} from '../../../src/authentication/protection';

describe('Authentication - Base', () => {
	let repo: QueryRepository<Principal>;
	let auth: Authentication<Principal>;

	beforeAll(async () => {
		auth = new (class extends Authentication<Principal> {
			public async authenticate(): Promise<Principal | null> {
				return null;
			}
		})({ db });

		repo = auth.principalRepo;
	});

	it('can create an principal', async () => {
		const id = await auth.createPrincipal({
			login: 'create_principal_test',
			name: 'Create Principal Test',
			type: 'user',
		});

		const principal = await repo.findOne({ where: { id } });
		if (!principal) {
			throw new Error('Principal not found');
		}

		expect(principal.id).toEqual(id as string);
	});

	it('delegates authentication protection callbacks', async () => {
		const attempts: string[] = [];
		const protection: AuthenticationProtection = {
			beforeAttempt: async (
				attempt: AuthenticationAttempt
			): Promise<AuthenticationProtectionResult> => {
				attempts.push(`before:${attempt.subject}`);
				return { allowed: true };
			},
			onFailure: async (attempt: AuthenticationAttempt) => {
				attempts.push(`failure:${attempt.subject}`);
			},
			onSuccess: async (attempt: AuthenticationAttempt) => {
				attempts.push(`success:${attempt.subject}`);
			},
		};

		const protectedAuth = new (class extends Authentication<Principal> {
			public async authenticate(): Promise<Principal | null> {
				return null;
			}

			public async exerciseProtection(
				attempt: AuthenticationAttempt
			): Promise<void> {
				await this.beforeAuthenticationAttempt(attempt);
				await this.recordAuthenticationFailure(attempt);
				await this.recordAuthenticationSuccess(attempt);
			}
		})({ db, authenticationProtection: protection });

		await protectedAuth.exerciseProtection({
			scheme: 'test',
			subject: 'subject-1',
		});

		expect(attempts).toEqual([
			'before:subject-1',
			'failure:subject-1',
			'success:subject-1',
		]);
	});

	it('uses no-op authentication protection by default', async () => {
		const unprotectedAuth = new (class extends Authentication<Principal> {
			public async authenticate(): Promise<Principal | null> {
				return null;
			}

			public async exerciseProtection(
				attempt: AuthenticationAttempt
			): Promise<AuthenticationProtectionResult> {
				const result = await this.beforeAuthenticationAttempt(attempt);
				await this.recordAuthenticationFailure(attempt);
				await this.recordAuthenticationSuccess(attempt);

				return result;
			}
		})({ db });

		const result = await unprotectedAuth.exerciseProtection({
			scheme: 'test',
			subject: 'subject-1',
		});

		expect(result).toEqual({ allowed: true });
	});

	it('short-circuits authentication when protection denies an attempt', async () => {
		const callbacks: string[] = [];
		const protection: AuthenticationProtection = {
			beforeAttempt: async () => {
				callbacks.push('before');
				return { allowed: false, retryAfterSeconds: 30 };
			},
			onFailure: async () => {
				callbacks.push('failure');
			},
			onSuccess: async () => {
				callbacks.push('success');
			},
		};

		const protectedAuth = new (class extends Authentication<Principal> {
			public credentialsChecked = false;
			public protectionResult?: AuthenticationProtectionResult;

			public async authenticate(
				subject: string
			): Promise<Principal | null> {
				this.protectionResult = await this.beforeAuthenticationAttempt({
					scheme: 'test',
					subject,
				});

				if (!this.protectionResult.allowed) {
					return null;
				}

				this.credentialsChecked = true;
				return null;
			}
		})({ db, authenticationProtection: protection });

		const principal = await protectedAuth.authenticate('subject-1');

		expect(principal).toBeNull();
		expect(protectedAuth.protectionResult).toEqual({
			allowed: false,
			retryAfterSeconds: 30,
		});
		expect(protectedAuth.credentialsChecked).toBe(false);
		expect(callbacks).toEqual(['before']);
	});

	it('can create a principal with all fields', async () => {
		const id = await auth.createPrincipal({
			login: 'full_principal_test',
			name: 'Full Principal Test',
			type: 'service',
		});

		const principal = await repo.findOne({ where: { id } });
		if (!principal) {
			throw new Error('Principal not found');
		}

		expect(principal.login).toEqual('full_principal_test');
		expect(principal.name).toEqual('Full Principal Test');
		expect(principal.type).toEqual('service');
	});

	it('can find active principal', async () => {
		await auth.createPrincipal({
			login: 'active_principal_test',
			name: 'Active Principal Test',
			type: 'user',
		});

		const principal = await auth.findActivePrincipal({
			where: { login: 'active_principal_test' },
		});

		expect(principal?.login).toEqual('active_principal_test');
	});

	it('can find active principal with default isActiveQuery', async () => {
		const testLogin = 'active_query_test_' + Date.now();
		await auth.createPrincipal({
			login: testLogin,
			name: 'Active Query Test',
			type: 'user',
		});

		const principal = await auth.findActivePrincipal({
			where: { login: testLogin },
		});

		expect(principal?.login).toEqual(testLogin);
	});

	it('should return null when finding non-existent principal', async () => {
		const principal = await auth.findActivePrincipal({
			where: { login: 'non_existent_login_' + Date.now() },
		});

		expect(principal).toBeNull();
	});

	it('should combine isActiveQuery with existing where clause', async () => {
		const authWithActiveQuery =
			new (class extends Authentication<Principal> {
				protected override isActiveQuery(): Expression<Principal> {
					return { deactivate_timestamp: null };
				}

				public async authenticate(): Promise<Principal | null> {
					return null;
				}
			})({ db });

		const testLogin = 'combined_query_test_' + Date.now();
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const id = await authWithActiveQuery.createPrincipal({
			login: testLogin,
			name: 'Combined Query Test',
			type: 'user',
		});

		const principal = await authWithActiveQuery.findActivePrincipal({
			where: { type: 'user' },
		});

		expect(principal).not.toBeNull();
	});

	it('should use isActiveQuery when no where clause provided', async () => {
		const authWithActiveQuery =
			new (class extends Authentication<Principal> {
				protected override isActiveQuery(): Expression<Principal> {
					return { type: 'user' };
				}

				public async authenticate(): Promise<Principal | null> {
					return null;
				}
			})({ db });

		const testLogin = 'is_active_only_' + Date.now();
		await authWithActiveQuery.createPrincipal({
			login: testLogin,
			name: 'Is Active Only Test',
			type: 'user',
		});

		const principal = await authWithActiveQuery.findActivePrincipal({});

		expect(principal?.type).toEqual('user');
	});

	it('can create multiple principals', async () => {
		const id1 = await auth.createPrincipal({
			login: 'multi_1_' + Date.now(),
			name: 'Multi Test 1',
			type: 'user',
		});

		const id2 = await auth.createPrincipal({
			login: 'multi_2_' + Date.now(),
			name: 'Multi Test 2',
			type: 'service',
		});

		expect(id1).not.toEqual(id2);

		const p1 = await repo.findOne({ where: { id: id1 as string } });
		const p2 = await repo.findOne({ where: { id: id2 as string } });

		expect(p1?.type).toEqual('user');
		expect(p2?.type).toEqual('service');
	});

	it('can deactivate a principal', async () => {
		const id = await auth.createPrincipal({
			login: 'deactivate_test_' + Date.now(),
			name: 'Deactivate Test',
			type: 'user',
		});

		// Principal should be findable before deactivation
		let principal = await auth.findActivePrincipal({
			where: { id: id as string },
		});
		expect(principal).not.toBeNull();
		expect(principal?.deactivate_timestamp).toBeNull();

		// Deactivate the principal
		await auth.deactivatePrincipal(id as string);

		// Principal should no longer be found by findActivePrincipal
		principal = await auth.findActivePrincipal({
			where: { id: id as string },
		});
		expect(principal).toBeNull();

		// But it should still exist in the database
		const directQuery = await repo.findOne({ where: { id: id as string } });
		expect(directQuery).not.toBeNull();
		expect(directQuery?.deactivate_timestamp).not.toBeNull();
	});
});
