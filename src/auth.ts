import { Database, DatabaseRecord, QueryRepository } from '@riao/dbal';

export interface AuthOptions {
	db: Database;
	userTable?: string;
}

export abstract class AuthBase<TUser extends DatabaseRecord = DatabaseRecord> {
	protected db: Database;
	protected userRepo: QueryRepository<TUser>;
	protected userTable = 'users';

	public constructor(options: AuthOptions) {
		for (const key in options) {
			this[key] = options[key];
		}

		this.userRepo = this.db.getQueryRepository({
			table: this.userTable,
		});
	}
}
