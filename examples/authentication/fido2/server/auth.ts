import { Fido2Authentication } from '../../../../src/authentication/authentication-fido2';
import { ColumnType, Database, Migration } from '@riao/dbal';
import { User } from './user';
import { QueryRepository } from '@riao/dbal';

/**
 * Extended FIDO2 Authentication class with custom user support
 */
export class Auth extends Fido2Authentication<User> {
	protected override accountRepo: QueryRepository<User>;

	constructor(options: {
		repo: QueryRepository<User>;
		db: Database;
		rpName: string;
		rpID: string;
		origin: string;
	}) {
		super(options);
		this.accountRepo = options.repo;
	}
}
