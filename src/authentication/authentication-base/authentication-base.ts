import {
	and,
	DatabaseRecord,
	DatabaseRecordId,
	Expression,
	SelectQuery,
} from '@riao/dbal';
import { Auth } from '../../auth/auth';
import { Hash } from '../../hash';

export abstract class AuthenticationBase<
	TAccount extends DatabaseRecord,
> extends Auth<TAccount> {
	protected hash: Hash = new Hash();

	public async createAccount(account: TAccount): Promise<DatabaseRecordId> {
		const inserted = await this.accountRepo.insertOne({
			record: account,
		});

		return inserted[this.accountIdColumn] as DatabaseRecordId;
	}

	public abstract authenticate(credentials: any): Promise<TAccount | null>;

	public async findActiveAccount(
		query: SelectQuery<TAccount>
	): Promise<TAccount | null> {
		const isActiveQuery = this.isActiveQuery();

		if (query.where && isActiveQuery !== undefined) {
			query.where = [isActiveQuery, and, query.where];
		}
		else if (isActiveQuery !== undefined) {
			query.where = isActiveQuery;
		}

		const account = await this.accountRepo.findOne({
			...query,
		});

		return account;
	}

	protected isActiveQuery(): undefined | Expression<TAccount> {
		return undefined;
	}
}
