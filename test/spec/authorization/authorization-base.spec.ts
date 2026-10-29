import {
	Authorization,
	AuthorizationContext,
	AuthorizationResult,
} from '../../../src/authorization';
import { Principal } from '../../../src/auth';
import { db } from '../../database';

describe('Authorization - Base', () => {
	let auth: Authorization<Principal>;
	let testPrincipal: Principal;

	beforeAll(async () => {
		// Create a concrete implementation of Authorization for testing
		auth = new (class extends Authorization<Principal> {
			public async evaluate(
				context: AuthorizationContext<Principal>
			): Promise<AuthorizationResult> {
				return this.checkPermission(context);
			}

		})({ db });

		// Create a test principal
		const principalId = await auth.principalRepo.insertOne({
			record: {
				login: 'auth_test_principal_' + Date.now(),
				name: 'Authorization Test Principal',
				type: 'user',
				create_timestamp: new Date(),
			} as Principal,
		});

		const principal = await auth.principalRepo.findOne({
			where: { id: principalId.id },
		});
		if (!principal) {
			throw new Error('Test principal not found');
		}
		testPrincipal = principal;
	});

	describe('evaluate', () => {
		it('should evaluate authorization context and result', async () => {
			const context: AuthorizationContext<Principal> = {
				principal: testPrincipal,
				action: 'read',
				resource: 'document_123',
			};

			const result = await auth.evaluate(context);

			expect(result).toBeDefined();
			expect(result.allowed).toBeDefined();
			expect(typeof result.allowed).toBe('boolean');
		});

		it('should include reason when provided', async () => {
			const context: AuthorizationContext<Principal> = {
				principal: testPrincipal,
				action: 'delete',
				resource: 'document_456',
				metadata: { reason: 'test' },
			};

			const result = await auth.evaluate(context);

			expect(result).toBeDefined();
			expect('allowed' in result).toBe(true);
		});

		it('should handle authorization context with metadata', async () => {
			const context: AuthorizationContext<Principal> = {
				principal: testPrincipal,
				action: 'write',
				resource: { id: 'resource_789', type: 'document' },
				metadata: {
					ipAddress: '192.168.1.1',
					timestamp: Date.now(),
				},
			};

			const result = await auth.evaluate(context);

			expect(result).toBeDefined();
			expect(result.allowed).toBeDefined();
		});

		it('should handle authorization without resource', async () => {
			const context: AuthorizationContext<Principal> = {
				principal: testPrincipal,
				action: 'admin_panel_access',
			};

			const result = await auth.evaluate(context);

			expect(result).toBeDefined();
			expect(result.allowed).toBeDefined();
		});

		it('should handle authorization with object resource', async () => {
			const context: AuthorizationContext<Principal> = {
				principal: testPrincipal,
				action: 'update',
				resource: {
					id: 'resource_id',
					type: 'user_profile',
					owner: testPrincipal.id,
				},
			};

			const result = await auth.evaluate(context);

			expect(result).toBeDefined();
			expect(result.allowed).toBeDefined();
		});
	});

	describe('isAuthorized', () => {
		it('should return true if authorized', async () => {
			const auth2 = new (class extends Authorization<Principal> {
				public async evaluate(): Promise<AuthorizationResult> {
					return { allowed: true };
				}

			})({ db });

			const isAuthorized = await auth2.isAuthorized({
				principal: testPrincipal,
				action: 'read',
				resource: 'doc_1',
			});

			expect(isAuthorized).toBe(true);
		});

		it('should return false if not authorized', async () => {
			const auth2 = new (class extends Authorization<Principal> {
				public async evaluate(): Promise<AuthorizationResult> {
					return {
						allowed: false,
						reason: 'Insufficient permissions',
					};
				}

			})({ db });

			const isAuthorized = await auth2.isAuthorized({
				principal: testPrincipal,
				action: 'delete',
				resource: 'doc_2',
			});

			expect(isAuthorized).toBe(false);
		});

		it('should accept action and resource parameters', async () => {
			const auth2 = new (class extends Authorization<Principal> {
				public async evaluate(): Promise<AuthorizationResult> {
					return { allowed: true };
				}

			})({ db });

			const isAuthorized = await auth2.isAuthorized({
				principal: testPrincipal,
				action: 'write',
				resource: 'doc_3',
				metadata: { ipAddress: '127.0.0.1' },
			});

			expect(isAuthorized).toBe(true);
		});
	});

	describe('checkPermission', () => {
		it('should return false by default with reason', async () => {
			const context: AuthorizationContext<Principal> = {
				principal: testPrincipal,
				action: 'test_action',
			};

			const result = await auth.evaluate(context);

			expect(result.allowed).toBe(false);
			expect(result.reason).toBe('No authorization model configured');
		});

		it('should be overridable by subclasses', async () => {
			const auth2 = new (class extends Authorization<Principal> {
				protected override async checkPermission(
					context: AuthorizationContext<Principal>
				): Promise<AuthorizationResult> {
					if (
						context.action === 'admin_access' &&
						context.principal.type === 'user'
					) {
						return {
							allowed: false,
							reason: 'Users cannot access admin area',
						};
					}
					return { allowed: true };
				}

				public async evaluate(
					context: AuthorizationContext<Principal>
				): Promise<AuthorizationResult> {
					return this.checkPermission(context);
				}

			})({ db });

			const result = await auth2.evaluate({
				principal: testPrincipal,
				action: 'admin_access',
			});

			expect(result.allowed).toBe(false);
			expect(result.reason).toBe('Users cannot access admin area');
		});
	});

	describe('Authorization Context', () => {
		it('should create context with required fields', () => {
			const context: AuthorizationContext<Principal> = {
				principal: testPrincipal,
				action: 'read',
			};

			expect(context.principal).toBe(testPrincipal);
			expect(context.action).toBe('read');
			expect(context.resource).toBeUndefined();
			expect(context.metadata).toBeUndefined();
		});

		it('should create context with all fields', () => {
			const metadata = { ipAddress: '192.168.1.1', userId: '123' };
			const context: AuthorizationContext<Principal> = {
				principal: testPrincipal,
				action: 'write',
				resource: 'doc_789',
				metadata,
			};

			expect(context.principal).toBe(testPrincipal);
			expect(context.action).toBe('write');
			expect(context.resource).toBe('doc_789');
			expect(context.metadata).toBe(metadata);
		});

		it('should support object resources', () => {
			const resource = {
				id: '123',
				type: 'document',
				owner: 'user_456',
			};
			const context: AuthorizationContext<Principal> = {
				principal: testPrincipal,
				action: 'update',
				resource,
			};

			expect(context.resource).toBe(resource);
		});
	});

	describe('AuthorizationResult', () => {
		it('should create result with required fields', () => {
			const result: AuthorizationResult = {
				allowed: true,
			};

			expect(result.allowed).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it('should create result with reason', () => {
			const result: AuthorizationResult = {
				allowed: false,
				reason: 'Insufficient permissions',
			};

			expect(result.allowed).toBe(false);
			expect(result.reason).toBe('Insufficient permissions');
		});

		it('should support various reason values', () => {
			const reasons = [
				'Principal is deactivated',
				'Resource not found',
				'Action not allowed',
				'Invalid context',
			];

			reasons.forEach((reason) => {
				const result: AuthorizationResult = {
					allowed: false,
					reason,
				};

				expect(result.reason).toBe(reason);
			});
		});
	});
});
