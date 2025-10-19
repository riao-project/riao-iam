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
	TPrincipal extends DatabaseRecord,
> extends Auth<TPrincipal> {
	protected hash: Hash = new Hash();

	public async createPrincipal(
		principal: TPrincipal
	): Promise<DatabaseRecordId> {
		const inserted = await this.principalRepo.insertOne({
			record: principal,
		});

		const identifier: string = this.principalRepo.getIdentifier() ?? 'id';

		return inserted[identifier] as DatabaseRecordId;
	}

	public abstract authenticate(credentials: any): Promise<TPrincipal | null>;

	public async findActivePrincipal(
		query: SelectQuery<TPrincipal>
	): Promise<TPrincipal | null> {
		const isActiveQuery = this.isActiveQuery();

		if (query.where && isActiveQuery !== undefined) {
			query.where = [isActiveQuery, and, query.where];
		}
		else if (isActiveQuery !== undefined) {
			query.where = isActiveQuery;
		}

		const principal = await this.principalRepo.findOne({
			...query,
		});

		return principal;
	}

	protected isActiveQuery(): undefined | Expression<TPrincipal> {
		return undefined;
	}
}
