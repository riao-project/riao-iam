import { Database, DatabaseRecord, QueryRepository } from '@riao/dbal';

export interface AuthOptions {
	db: Database;
}

export abstract class Auth<TPrincipal extends DatabaseRecord> {
	public principalRepo: QueryRepository<TPrincipal>;
	protected loginColumn = 'login';

	public constructor(options: AuthOptions) {
		this.principalRepo = options.db.getQueryRepository<TPrincipal>({
			table: 'iam_principals',
			identifiedBy: 'id',
		});
	}
}
