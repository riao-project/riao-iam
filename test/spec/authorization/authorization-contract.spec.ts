import { Database } from '@riao/dbal';
import { Principal } from '../../../src/auth';
import {
	Authorization,
	AuthorizationContext,
	AuthorizationResult,
	AuthorizationService,
	AuthorizationSubject,
} from '../../../src/authorization';
import {
	Authentication,
	AuthenticationBlockedError,
	AuthenticationRejectedError,
} from '../../../src/authentication';

describe('IAM service contracts', () => {
	const db = jasmine.createSpyObj<Database>('db', ['getQueryRepository']);

	class IdAuthorization extends Authorization<
		Principal, AuthorizationSubject
	> {
		public async evaluate(
			context: AuthorizationContext<AuthorizationSubject>
		): Promise<AuthorizationResult> {
			return this.checkPermission(context);
		}

		protected override async checkPermission(
			context: AuthorizationContext<AuthorizationSubject>
		): Promise<AuthorizationResult> {
			return { allowed: context.principal.id === 'allowed' };
		}

		public async grantPermission(): Promise<void> {}
		public async revokePermission(): Promise<void> {}
	}

	it('uses ID-only subjects through every evaluation surface', async () => {
		const auth = new IdAuthorization({ db });
		const service: AuthorizationService = auth;
		const context = { principal: { id: 'allowed' }, action: 'read' };
		expect(await service.evaluate(context)).toEqual({ allowed: true });
		expect(await auth.isAuthorized(context)).toBe(true);
		expect(await auth.isAuthorized({
			...context, principal: { id: 'denied' },
		})).toBe(false);
	});

	it('retains rich subjects for attribute-based policies', async () => {
		interface AttributePrincipal extends Principal {
			department: string;
		}
		const auth = new (class extends Authorization<AttributePrincipal> {
			public async evaluate(
				context: AuthorizationContext<AttributePrincipal>
			): Promise<AuthorizationResult> {
				return { allowed: context.principal.department === 'finance' };
			}
			public async grantPermission(): Promise<void> {}
			public async revokePermission(): Promise<void> {}
		})({ db });
		const principal: AttributePrincipal = {
			id: 'user', login: 'user', name: 'User', type: 'user',
			create_timestamp: new Date(), department: 'finance',
		};
		expect(await auth.isAuthorized({ principal, action: 'read' }))
			.toBe(true);
	});

	it('propagates policy failures', async () => {
		const auth = new IdAuthorization({ db });
		const error = new Error('Policy store unavailable');
		spyOn(auth, 'evaluate').and.rejectWith(error);
		await expectAsync(auth.isAuthorized({
			principal: { id: 'allowed' }, action: 'read',
		})).toBeRejectedWith(error);
	});

	it('forwards resource objects and metadata unchanged', async () => {
		const auth = new IdAuthorization({ db });
		const evaluate = spyOn(auth, 'evaluate').and.callThrough();
		const context: AuthorizationContext<AuthorizationSubject> = {
			principal: { id: 'allowed' },
			action: 'read',
			resource: { type: 'document', id: 'document-1' },
			metadata: { tenantId: 'tenant-1' },
		};
		expect(await auth.isAuthorized(context)).toBe(true);
		expect(evaluate).toHaveBeenCalledOnceWith(context);
	});

	it('propagates active principal lookup failures', async () => {
		const repo = jasmine.createSpyObj('repo', ['findOne']);
		const error = new Error('Principal store unavailable');
		repo.findOne.and.rejectWith(error);
		db.getQueryRepository.and.returnValue(repo);
		const auth = new (class extends Authentication<Principal> {
			public async authenticate(): Promise<Principal | null> {
				return null;
			}
		})({ db });
		await expectAsync(auth.findActivePrincipal({
			where: { id: 'user' },
		})).toBeRejectedWith(error);
	});

	it('exposes framework-neutral rejection and block errors', () => {
		const error = new AuthenticationBlockedError(30);
		expect(error instanceof AuthenticationRejectedError).toBe(true);
		expect(error.retryAfterSeconds).toBe(30);
	});
});
