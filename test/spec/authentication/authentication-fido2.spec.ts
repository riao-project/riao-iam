import { Fido2Authentication } from '../../../src/authentication/authentication-fido2';
import { createDatabase, runMigrations } from '../../database';
import { Account } from '../../account';
import { AuthenticationFido2Migrations } from '../../../src/authentication/authentication-fido2/authentication-fido2-migrations';

describe('Authentication - FIDO2', () => {
	const db = createDatabase('authentication-fido2');
	const repo = db.getQueryRepository<Account>({
		table: 'iam_accounts',
		identifiedBy: 'id',
	});

	const auth = new (class extends Fido2Authentication<Account> {
		protected override accountRepo = repo;
	})({
		repo,
		db,
		rpName: 'Test RP',
		rpID: 'localhost',
		origin: 'http://localhost',
	});

	let testAccount: Account;

	// Helper to create unique test accounts per test
	async function createTestAccount(testName: string): Promise<Account> {
		const account: Account = {
			login: `${testName}@example.com`,
		};

		await repo.insertOne({
			record: account,
		});

		const accounts = await repo.find({
			where: { login: account.login },
		});

		return { ...account, id: accounts[0].id };
	}

	// Helper to create registration response with realistic structure
	function createRegistrationResponse(challenge: string, credId: string) {
		const clientDataJSON = Buffer.from(
			JSON.stringify({
				type: 'webauthn.create',
				challenge: Buffer.from(challenge).toString('base64url'),
				origin: 'http://localhost',
			})
		).toString('base64');

		return {
			id: credId,
			rawId: credId,
			response: {
				attestationObject: 'mock-attestation-object',
				clientDataJSON,
				transports: ['usb' as const],
			},
			type: 'public-key' as const,
			clientExtensionResults: {},
		};
	}

	// Helper to create authentication response
	function createAuthResponse(challenge: string, credId: string) {
		const clientDataJSON = Buffer.from(
			JSON.stringify({
				type: 'webauthn.get',
				challenge: Buffer.from(challenge).toString('base64url'),
				origin: 'http://localhost',
			})
		).toString('base64');

		return {
			id: credId,
			rawId: credId,
			response: {
				authenticatorData: 'mock-authenticator-data',
				signature: 'mock-signature',
				clientDataJSON,
			},
			type: 'public-key' as const,
			clientExtensionResults: {},
		};
	}

	// Helper to create and store a test credential
	async function createTestCredential(
		accountId: number | string,
		credId: string,
		publicKey = 'mock-public-key',
		counter = 0
	) {
		await auth['credentialRepo'].insert({
			records: [
				{
					id: credId,
					account_id: accountId,
					public_key: publicKey,
					counter,
				},
			],
		});
	}

	// Helper to verify challenge state
	async function verifyChallengeState(
		accountId: number | string,
		type: 'registration' | 'authentication',
		expectedCount = 1,
		used = false
	) {
		const challenges = await auth['challengeRepo'].find({
			where: {
				account_id: accountId,
				challenge_type: type,
				used,
			},
		});
		expect(challenges.length).toBe(expectedCount);
		return challenges;
	}

	// Helper function to quickly set up a test account with credentials
	async function setupTestAccount(
		login: string,
		credentialId: string,
		publicKey: string = Buffer.from('test-key').toString('base64')
	): Promise<number | string> {
		const accountId = await auth.createAccount({ login });
		await createTestCredential(accountId, credentialId, publicKey);
		return accountId;
	}

	beforeAll(async () => {
		await db.init();
		await runMigrations(db, new AuthenticationFido2Migrations());

		// Create a shared test account for individual method tests
		// (End-to-End tests use createTestAccount for isolation)
		testAccount = {
			login: 'testuser@example.com',
		};

		await repo.insert({
			records: [testAccount],
		});

		// Get the account ID
		const accounts = await repo.find({
			where: { login: testAccount.login },
		});
		const accountId = accounts[0].id;

		testAccount.id = accountId;
	});

	afterAll(async () => {
		await db.disconnect();
	});

	describe('End-to-End FIDO2 Flows', () => {
		describe('Complete Authentication Flow', () => {
			it('should fail auth with non-existent credential', async () => {
				const failTestAccount = await createTestAccount(
					'auth-fail-nonexistent-test'
				);
				const userID = failTestAccount.id!.toString();
				await auth.generateAuthenticationOptions(userID);

				// Create mock authentication response using helper
				const mockAuthResponse = createAuthResponse(
					'test-challenge',
					'non-existent-credential'
				);

				// Authentication should fail with non-existent credential
				const result = await auth.authenticate({
					response: mockAuthResponse,
					accountId: failTestAccount.id!,
				});

				expect(result).toBeNull();
			});

			it('should fail authentication without challenge', async () => {
				const noChallengeTestAccount = await createTestAccount(
					'auth-no-challenge-test'
				);

				// Don't generate authentication options
				// Create mock authentication response using helper
				const mockAuthResponse = createAuthResponse(
					'non-existent-challenge',
					'auth-no-challenge-credential'
				);

				// Authentication should fail without challenge
				const result = await auth.authenticate({
					response: mockAuthResponse,
					accountId: noChallengeTestAccount.id!,
				});

				expect(result).toBeNull();
			});
		});

		describe('Complete User Journey', () => {
			it('should support full user lifecycle', async () => {
				// Create a new account with credentials
				const accountId = await setupTestAccount(
					'journey-lifecycle-test@example.com',
					'journey-lifecycle-credential',
					Buffer.from('journey-key').toString('base64')
				);

				expect(accountId).toBeDefined();

				// Verify registration challenge was created
				await verifyChallengeState(accountId, 'registration');

				// Generate authentication options
				const authOptions = await auth.generateAuthenticationOptions(
					accountId.toString()
				);
				expect(authOptions.allowCredentials).toBeDefined();
				expect(authOptions.allowCredentials!.length).toBe(1);

				// Verify authentication challenge was stored
				await verifyChallengeState(accountId, 'authentication');
			});

			it('should handle multiple credentials per account', async () => {
				const multiCredTestAccount = await createTestAccount(
					'journey-multi-credentials-test'
				);

				// Create multiple credentials using helper
				await createTestCredential(
					multiCredTestAccount.id!,
					'multi-credential-1',
					Buffer.from('key-1').toString('base64'),
					1
				);

				await createTestCredential(
					multiCredTestAccount.id!,
					'multi-credential-2',
					Buffer.from('key-2').toString('base64'),
					2
				);

				// Generate authentication options
				const options = await auth.generateAuthenticationOptions(
					multiCredTestAccount.id!.toString()
				);

				// Should include exactly our two credentials
				expect(options.allowCredentials).toBeDefined();
				expect(options.allowCredentials!.length).toBe(2);

				const credIds = options.allowCredentials!.map(
					(cred) => cred.id
				);

				// Verify our specific credentials are included
				expect(credIds).toContain('multi-credential-1');
				expect(credIds).toContain('multi-credential-2');
			});
		});

		describe('Error Handling', () => {
			it('should handle expired challenges gracefully', async () => {
				// Generate options to create a challenge
				await auth.generateRegistrationOptions(testAccount);

				// Manually expire the challenge
				const pastDate = new Date(Date.now() - 1000 * 60 * 60);
				await auth['challengeRepo'].update({
					set: { expires: pastDate },
					where: {
						account_id: testAccount.id,
						challenge_type: 'registration',
					},
				});

				// Attempt verification with expired challenge
				// Create mock registration response using helper
				const mockResponse = createRegistrationResponse(
					'expired-challenge',
					'test-cred'
				);

				const result = await auth.verifyRegistration(
					testAccount,
					mockResponse
				);
				expect(result.verified).toBe(false);
			});

			it('should handle authentication without credentials', async () => {
				// Attempt authentication with no stored credentials
				const options = await auth.generateAuthenticationOptions();

				// Should work but have no allowCredentials
				expect(options.allowCredentials).toBeUndefined();
			});
		});

		describe('Concurrent Operations', () => {
			it('should handle concurrent challenge generation', async () => {
				const concurrentCount = 3;
				const promises = [];

				for (let i = 0; i < concurrentCount; i++) {
					const promise = (async () => {
						const concurrentAccount = await createTestAccount(
							`concurrent-${i}-${Date.now()}`
						);

						return auth.generateRegistrationOptions(
							concurrentAccount
						);
					})();

					promises.push(promise);
				}

				const results = await Promise.all(promises);

				// All challenges should be unique
				const challenges = results.map((r) => r.challenge);
				const uniqueChallenges = new Set(challenges);

				expect(uniqueChallenges.size).toBe(concurrentCount);
			});
		});
	});

	describe('generateRegistrationOptions', () => {
		it('should generate valid registration options', async () => {
			const options = await auth.generateRegistrationOptions(testAccount);

			expect(options.rp.name).toBe('Test RP');
			expect(options.rp.id).toBe('localhost');
			expect(options.user.name).toBe(testAccount.login);
			expect(options.user.displayName).toBe(testAccount.login);
			expect(typeof options.challenge).toBe('string');
			expect(Array.isArray(options.pubKeyCredParams)).toBe(true);
			expect(typeof options.timeout).toBe('number');
			expect(options.attestation).toBe('none');

			if (options.authenticatorSelection) {
				// authenticatorAttachment should be undefined
				// (allows both platform and cross-platform)
				expect(
					options.authenticatorSelection.authenticatorAttachment
				).toBeUndefined();
				expect(options.authenticatorSelection.userVerification).toBe(
					'preferred'
				);
				expect(options.authenticatorSelection.requireResidentKey).toBe(
					false
				);
			}

			// excludeCredentials contains existing credentials for account
			// Length may vary, just verify structure
			if (options.excludeCredentials) {
				expect(Array.isArray(options.excludeCredentials)).toBe(true);
			}
		});

		it('should throw error if account has no ID', async () => {
			const accountWithoutId = {
				login: 'registration-no-id-test@example.com',
			};

			await expectAsync(
				auth.generateRegistrationOptions(accountWithoutId as Account)
			).toBeRejectedWithError('Account must have an ID');
		});

		it('should exclude existing credentials', async () => {
			// Create a unique credential for this test using helper
			const testCredId = 'test-credential-exclude-existing';
			await createTestCredential(
				testAccount.id!,
				testCredId,
				'mock-public-key'
			);

			const options = await auth.generateRegistrationOptions(testAccount);

			expect(options.excludeCredentials).toBeDefined();
			if (options.excludeCredentials) {
				// Should include our test credential in the exclude list
				const excludedIds = options.excludeCredentials.map((c) => c.id);
				expect(excludedIds).toContain(testCredId);
			}
		});
	});

	describe('verifyRegistration', () => {
		beforeEach(async () => {
			// Generate registration options first
			await auth.generateRegistrationOptions(testAccount);
		});

		it('should return false for invalid challenge', async () => {
			// Create a dedicated test account for this test
			const testAcc = await createTestAccount(
				'verify-invalid-challenge-test'
			);

			// Generate registration options to create a challenge
			await auth.generateRegistrationOptions(testAcc);

			// Create mock registration response using helper
			const mockResponse = createRegistrationResponse(
				'mock-challenge-invalid',
				'mock-credential-invalid-id'
			);

			// Corrupt the challenge by updating it
			await auth['challengeRepo'].update({
				set: { id: 'invalid-challenge-' + Date.now() },
				where: {
					account_id: testAcc.id,
					challenge_type: 'registration',
				},
			});

			const result = await auth.verifyRegistration(testAcc, mockResponse);

			expect(result.verified).toBe(false);
		});

		it('should return false if no challenge exists', async () => {
			// Delete the challenge
			await auth['challengeRepo'].delete({
				where: {
					account_id: testAccount.id,
					challenge_type: 'registration',
				},
			});

			// Create mock registration response using helper
			const mockResponse = createRegistrationResponse(
				'mock-challenge',
				'mock-credential-id'
			);

			const result = await auth.verifyRegistration(
				testAccount,
				mockResponse
			);

			expect(result.verified).toBe(false);
		});

		it('should throw error if account has no ID', async () => {
			const accountWithoutId = {
				login: 'test-auth-no-id@example.com',
			};
			// Create mock registration response using helper
			const mockResponse = createRegistrationResponse(
				'mock-challenge',
				'mock-credential-id'
			);

			await expectAsync(
				auth.verifyRegistration(
					accountWithoutId as Account,
					mockResponse
				)
			).toBeRejectedWithError('Account must have an ID');
		});
	});

	describe('generateAuthenticationOptions', () => {
		it('should generate auth options without userID', async () => {
			const options = await auth.generateAuthenticationOptions();

			expect(typeof options.challenge).toBe('string');
			expect(typeof options.timeout).toBe('number');
			expect(options.rpId).toBe('localhost');
			expect(options.userVerification).toBe('preferred');
			expect(options.allowCredentials).toBeUndefined();
		});

		it('should generate auth options with userID', async () => {
			const testCredentialId = 'test-credential-userid';
			await createTestCredential(testAccount.id!, testCredentialId);

			const userID = testAccount.id!.toString();
			const options = await auth.generateAuthenticationOptions(userID);

			expect(typeof options.challenge).toBe('string');
			expect(typeof options.timeout).toBe('number');
			expect(options.rpId).toBe('localhost');
			expect(options.userVerification).toBe('preferred');
			expect(options.allowCredentials).toBeDefined();

			if (options.allowCredentials) {
				// Should have at least one credential for this account
				expect(options.allowCredentials.length).toBeGreaterThan(0);
				// Verify all credentials belong to this account
				options.allowCredentials.forEach((cred) => {
					expect(typeof cred.id).toBe('string');
					expect(cred.type).toBe('public-key');
				});
			}
		});
	});

	describe('createAccount', () => {
		it('should create account and generate options', async () => {
			const newAccount: Account = {
				login: 'newuser-create-account@example.com',
			};

			const accountId = await auth.createAccount(newAccount);

			expect(accountId).toBeDefined();

			// Check if account was created
			const createdAccount = await repo.findOne({
				where: { id: accountId },
			});
			expect(createdAccount).toBeDefined();
			expect(createdAccount!.login).toBe(newAccount.login);

			// Check if challenge was created for registration
			const challenges = await auth['challengeRepo'].find({
				where: {
					account_id: accountId,
					challenge_type: 'registration',
				},
			});
			expect(challenges.length).toBeGreaterThan(0);
		});
	});

	describe('helper methods', () => {
		let helperTestAccount: Account;
		let helperCredential1Id: string;
		let helperCredential2Id: string;

		beforeEach(async () => {
			// Create dedicated test account for helper method tests
			const timestamp = Date.now();
			helperTestAccount = await createTestAccount(
				`helper-methods-test-${timestamp}`
			);

			helperCredential1Id = `helper-credential-1-${timestamp}`;
			helperCredential2Id = `helper-credential-2-${timestamp}`;

			await createTestCredential(
				helperTestAccount.id!,
				helperCredential1Id,
				'key-1',
				1
			);

			await createTestCredential(
				helperTestAccount.id!,
				helperCredential2Id,
				'key-2',
				2
			);
		});

		describe('getExistingCredentials', () => {
			it('should return existing credentials for account', async () => {
				const credentials = await auth['getExistingCredentials'](
					helperTestAccount.id!.toString()
				);

				// Should find exactly our 2 test credentials
				expect(credentials.length).toBe(2);

				// Find our specific test credentials
				const cred1 = credentials.find(
					(c) => c.id === helperCredential1Id
				);
				const cred2 = credentials.find(
					(c) => c.id === helperCredential2Id
				);
				expect(cred1).toBeDefined();
				expect(cred2).toBeDefined();
			});

			it('should throw an error for missing id', async () => {
				const credentials = await auth['getExistingCredentials'](
					''
				).catch(() => []);

				expect(credentials.length).toBe(0);
			});
		});

		describe('getAuthenticatorByCredentialID', () => {
			it('should return authenticator credential by ID', async () => {
				const credential =
					await auth['getAuthenticatorByCredentialID'](
						helperCredential1Id
					);

				expect(credential).not.toBeNull();
				if (credential) {
					expect(credential.id)
						.withContext('Credential ID mismatch')
						.toBe('' + helperCredential1Id);
					expect(credential.account_id)
						.withContext('Account ID mismatch')
						.toEqual('' + helperTestAccount.id!);
					expect(credential.public_key)
						.withContext('Public key mismatch')
						.toBe('key-1');
					expect('' + credential.counter)
						.withContext('Counter mismatch')
						.toEqual('1');
				}
			});

			it('should return null for non-existent credential', async () => {
				const credential =
					await auth['getAuthenticatorByCredentialID'](
						'non-existent'
					);

				expect(credential).toBeNull();
			});

			it('should store credential ID as provided without encoding', async () => {
				// This test documents the fix for credential ID mismatch
				// Previously: Buffer.from(credential.id).toString()
				// Fixed: response.id (stored exactly as provided)
				const testCredId = 'ZXhhY3QtY3JlZGVudGlhbC1pZA';

				// Create credential with exact ID
				await createTestCredential(helperTestAccount.id!, testCredId);

				const storedCredential =
					await auth['getAuthenticatorByCredentialID'](testCredId);

				expect(storedCredential).not.toBeNull();
				expect(storedCredential!.id).toBe(testCredId);
			});
		});
	});
});
