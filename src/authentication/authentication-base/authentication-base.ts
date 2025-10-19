import { DatabaseRecord, DatabaseRecordId } from '@riao/dbal';
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

	public abstract authenticate(credentials: any): Promise<boolean>;
}
