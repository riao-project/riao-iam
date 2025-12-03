import { Migration } from '@riao/dbal';
import { AuthMigrations } from '../../auth/auth-migrations';

import {
	CreateFido2ChallengesTableMigration,
	CreateFido2CredentialsTableMigration,
} from './migrations';

export class AuthenticationFido2Migrations extends AuthMigrations {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public override getMigrations(): Record<string, typeof Migration<any>> {
		return {
			...super.getMigrations(),
			'create-fido2-credentials-table':
				CreateFido2CredentialsTableMigration,
			'create-fido2-challenges-table':
				CreateFido2ChallengesTableMigration,
		};
	}
}
