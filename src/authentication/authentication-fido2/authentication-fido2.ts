import { DatabaseRecordId, QueryRepository } from '@riao/dbal';
import { Account } from '../../../test/account';
import { AuthenticationBase } from '../authentication-base';
import { Database, Migration } from '@riao/dbal';
import {
	CreateFido2CredentialsTableMigration,
	CreateFido2ChallengesTableMigration,
} from './migrations';
import {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
	type GenerateRegistrationOptionsOpts,
	type GenerateAuthenticationOptionsOpts,
	type VerifyRegistrationResponseOpts,
	type VerifyAuthenticationResponseOpts,
	type RegistrationResponseJSON,
	type AuthenticationResponseJSON,
	type PublicKeyCredentialCreationOptionsJSON,
	type PublicKeyCredentialRequestOptionsJSON,
	type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { AuthOptions } from '../../auth/auth';

interface StoredChallenge {
	challenge_id: string;
	account_id: DatabaseRecordId;
	challenge_type: 'registration' | 'authentication';
	expires_at: Date;
	used: boolean;
	created_at?: Date;
}

interface AuthenticatorCredential {
	credential_id: string;
	account_id: DatabaseRecordId;
	public_key: string;
	counter: number;
	transports?: string;
	device_name?: string;
	created_at?: Date;
	updated_at?: Date;
}

interface Fido2Credentials {
	response: AuthenticationResponseJSON;
	accountId: DatabaseRecordId;
}

export interface Fido2AuthenticationOptions<TAccount extends Account = Account>
	extends AuthOptions<TAccount> {
	db: Database;
	rpName: string;
	rpID: string;
	origin: string;
}

export class Fido2Authentication<
	TAccount extends Account,
> extends AuthenticationBase<TAccount> {
	protected readonly rpName: string;
	protected readonly rpID: string;
	protected readonly origin: string;

	protected challengeTable = 'fido2_challenges';
	protected credentialTable = 'fido2_credentials';

	protected challengeRepo: QueryRepository<StoredChallenge>;
	protected credentialRepo: QueryRepository<AuthenticatorCredential>;

	constructor(options: Fido2AuthenticationOptions<TAccount>) {
		super(options);

		this.rpName = options.rpName;
		this.rpID = options.rpID;
		this.origin = options.origin;

		this.challengeRepo = options.db.getQueryRepository<StoredChallenge>({
			table: this.challengeTable,
		});

		this.credentialRepo =
			options.db.getQueryRepository<AuthenticatorCredential>({
				table: this.credentialTable,
			});
	}

	public async generateRegistrationOptions(
		account: TAccount
	): Promise<PublicKeyCredentialCreationOptionsJSON> {
		if (!account[this.accountIdColumn]) {
			throw new Error('Account must have an ID');
		}

		const accountId = account[this.accountIdColumn].toString();
		const login = account[this.loginColumn] || accountId;
		// TODO: Display name?
		const accountName = account[this.loginColumn] || accountId;

		const options: GenerateRegistrationOptionsOpts = {
			rpName: this.rpName,
			rpID: this.rpID,
			userID: new Uint8Array(Buffer.from(accountId, 'utf8')),
			userName: login,
			userDisplayName: accountName,
			attestationType: 'none',
			authenticatorSelection: {
				// Allow both platform and cross-platform authenticators
				userVerification: 'preferred',
				requireResidentKey: false,
			},
			excludeCredentials: await this.getExistingCredentials(accountId),
		};

		const registrationOptions = await generateRegistrationOptions(options);

		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
		await this.challengeRepo.insert({
			records: [
				{
					challenge_id: registrationOptions.challenge,
					account_id: account[this.accountIdColumn],
					challenge_type: 'registration',
					expires_at: expiresAt,
					used: false,
				},
			],
		});

		return registrationOptions;
	}

	public async verifyRegistration(
		account: TAccount,
		response: RegistrationResponseJSON
	): Promise<{ verified: boolean; registrationInfo?: object }> {
		if (!account[this.accountIdColumn]) {
			throw new Error('Account must have an ID');
		}

		// Find the challenge from database
		const challengesRaw = await this.challengeRepo.find({
			where: {
				account_id: account[this.accountIdColumn],
				challenge_type: 'registration',
				used: false,
			},
			limit: 1,
		});

		if (challengesRaw.length === 0) {
			return { verified: false };
		}

		const storedChallenge = challengesRaw[0];
		const opts: VerifyRegistrationResponseOpts = {
			response,
			expectedChallenge: storedChallenge.challenge_id,
			expectedOrigin: this.origin,
			expectedRPID: this.rpID,
		};

		try {
			const verification = await verifyRegistrationResponse(opts);

			if (verification.verified && verification.registrationInfo) {
				// Store the credential in database
				const { credential } = verification.registrationInfo;

				// Extract transports from the original response
				let transports: string[] = [];
				if (response.response.transports) {
					transports = response.response.transports;
				}
				else {
					// Default to common transports if not specified
					transports = ['internal', 'hybrid'];
				}

				await this.credentialRepo.insert({
					records: [
						{
							// Use the original credential ID from the response
							credential_id: response.id,
							account_id: account[this.accountIdColumn],
							public_key: Buffer.from(
								credential.publicKey
							).toString('base64'),
							counter: credential.counter,
							transports: JSON.stringify(transports),
						},
					],
				});

				// Mark challenge as used
				await this.challengeRepo.update({
					set: { used: true },
					where: { challenge_id: storedChallenge.challenge_id },
				});

				return {
					verified: true,
					registrationInfo: verification.registrationInfo,
				};
			}

			return { verified: false };
		}
		catch (error) {
			return { verified: false };
		}
	}

	public async generateAuthenticationOptions(
		userID?: string
	): Promise<PublicKeyCredentialRequestOptionsJSON> {
		const options: GenerateAuthenticationOptionsOpts = {
			rpID: this.rpID,
			// Use preferred to allow both platform and cross-platform
			userVerification: 'preferred',
		};

		if (userID) {
			options.allowCredentials =
				await this.getExistingCredentials(userID);
		}

		const authenticationOptions =
			await generateAuthenticationOptions(options);

		// Store challenge for verification
		if (userID) {
			const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
			await this.challengeRepo.insert({
				records: [
					{
						challenge_id: authenticationOptions.challenge,
						account_id: userID,
						challenge_type: 'authentication',
						expires_at: expiresAt,
						used: false,
					},
				],
			});
		}

		return authenticationOptions;
	}

	public override async createAccount(
		account: TAccount
	): Promise<DatabaseRecordId> {
		// Store account data first
		const accountId = await super.createAccount(account);

		// Create a account object with the ID for registration options
		const accountWithId = {
			...account,
			[this.accountIdColumn]: accountId,
		} as TAccount;

		// Generate and return registration options for client
		// Credential stored when verifyRegistration is called
		await this.generateRegistrationOptions(accountWithId);

		return accountId;
	}

	public override async authenticate(
		credentials: Fido2Credentials
	): Promise<TAccount | null> {
		const { response, accountId } = credentials;

		// Find the challenge from database
		const challengesRaw = await this.challengeRepo.find({
			where: {
				account_id: accountId,
				challenge_type: 'authentication',
				used: false,
			},
			limit: 1,
		});

		if (challengesRaw.length === 0) {
			return null;
		}

		const storedChallenge = challengesRaw[0];

		// Get the authenticator credential
		const authenticator = await this.getAuthenticatorByCredentialID(
			response.id
		);

		if (authenticator === null) {
			return null;
		}

		const opts: VerifyAuthenticationResponseOpts = {
			response,
			expectedChallenge: storedChallenge.challenge_id,
			expectedOrigin: this.origin,
			expectedRPID: this.rpID,
			credential: {
				id: authenticator.credential_id,
				publicKey: Buffer.from(authenticator.public_key, 'base64'),
				counter: authenticator.counter,
				transports: [],
			},
		};

		const verification = await verifyAuthenticationResponse(opts);

		if (!verification.verified) {
			return null;
		}

		// Update counter in database
		await this.credentialRepo.update({
			set: {
				counter: verification.authenticationInfo.newCounter,
			},
			where: { credential_id: authenticator.credential_id },
		});

		// Mark challenge as used
		await this.challengeRepo.update({
			set: { used: true },
			where: { challenge_id: storedChallenge.challenge_id },
		});

		// Retrieve and return the account
		return await this.findActiveAccount({
			where: <TAccount>{
				[this.accountIdColumn]: accountId,
			},
		});
	}

	protected async getExistingCredentials(accountId: string): Promise<
		{
			id: string;
			type: 'public-key';
			transports?: AuthenticatorTransportFuture[];
		}[]
	> {
		const credentials = await this.credentialRepo.find({
			where: { account_id: accountId },
		});

		return credentials.map((cred) => {
			let transports: AuthenticatorTransportFuture[] = [];

			// Parse transports from stored JSON string
			if (cred.transports) {
				try {
					const parsed = JSON.parse(cred.transports);
					transports = Array.isArray(parsed) ? parsed : [];
				}
				catch (error) {
					// Default to internal for platform authenticators
					transports = ['internal'];
				}
			}
			else {
				// If no transports stored, use common transports
				transports = ['internal', 'hybrid'];
			}

			return {
				id: cred.credential_id,
				type: 'public-key' as const,
				transports,
			};
		});
	}

	protected async getAuthenticatorByCredentialID(
		credentialID: string
	): Promise<AuthenticatorCredential | null> {
		return await this.credentialRepo.findOne({
			where: { credential_id: credentialID },
		});
	}

	public override getMigrations(db: Database): Record<string, Migration> {
		return {
			...super.getMigrations(db),
			'create-fido2-credentials-table':
				new CreateFido2CredentialsTableMigration(db, {
					table: this.credentialTable,
					accountTable: this.accountTable,
					accountTableIdColumn: this.accountIdColumn,
				}),
			'create-fido2-challenges-table':
				new CreateFido2ChallengesTableMigration(db, {
					table: this.challengeTable,
					accountTable: this.accountTable,
					accountTableIdColumn: this.accountIdColumn,
				}),
		};
	}
}
