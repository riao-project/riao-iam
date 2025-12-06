import { and, DatabaseRecordId, Expression, SelectQuery } from '@riao/dbal';
import { Auth, Principal } from '../auth';
import { Hash } from '../hash';
import { KeyValExpression } from '@riao/dbal/expression/key-val-expression';

export abstract class Authentication<
	TPrincipal extends Principal,
> extends Auth<TPrincipal> {
	protected hash: Hash = new Hash();

	public async createPrincipal(
		principal: Omit<TPrincipal, 'id' | 'create_timestamp'>
	): Promise<DatabaseRecordId> {
		const inserted = await this.principalRepo.insertOne({
			record: principal as TPrincipal,
		});

		return inserted.id as DatabaseRecordId;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

	public async deactivatePrincipal(
		principalId: DatabaseRecordId
	): Promise<void> {
		return this.principalRepo.update({
			set: {
				deactivate_timestamp: new Date(),
			} as Partial<TPrincipal>,
			where: { id: principalId } as KeyValExpression<TPrincipal>,
		});
	}

	protected isActiveQuery(): undefined | Expression<TPrincipal> {
		return {
			deactivate_timestamp: null,
		} as KeyValExpression<TPrincipal>;
	}
}
