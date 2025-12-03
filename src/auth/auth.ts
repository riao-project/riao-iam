import { DatabaseRecord, QueryRepository } from '@riao/dbal';
export interface AuthOptions<TAccount extends DatabaseRecord> {
	repo: QueryRepository<TAccount>;
}

export abstract class Auth<TAccount extends DatabaseRecord> {
	protected accountRepo: QueryRepository<TAccount>;
	protected accountTable = 'iam_accounts';
	protected accountIdColumn = 'id';
	protected loginColumn = 'login';

	public constructor(options: AuthOptions<TAccount>) {
		this.accountRepo = options.repo;
		this.accountTable =
			this.accountRepo.getTableName() || this.accountTable;
		this.accountIdColumn =
			this.accountRepo.getIdentifier() || this.accountIdColumn;
	}
}
