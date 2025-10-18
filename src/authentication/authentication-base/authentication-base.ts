import { DatabaseRecord, DatabaseRecordId } from '@riao/dbal';
import { Auth } from '../../auth/auth';
import { Hash } from '../../hash';

export abstract class AuthenticationBase<
	TPrincipal extends DatabaseRecord,
> extends Auth<TPrincipal> {
	protected hash: Hash = new Hash();

	public abstract createPrincipal(
		principal: TPrincipal
	): Promise<DatabaseRecordId>;

	public abstract authenticate(credentials: any): Promise<boolean>;
}
