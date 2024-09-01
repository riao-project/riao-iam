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
		this.db = options.db ?? this.db;
		this.userTable = options.userTable ?? this.userTable;

		this.userRepo = this.db.getQueryRepository({
			table: this.userTable,
		});
	}
}
