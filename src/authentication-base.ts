import {
	Database,
	DatabaseRecord,
	Expression,
	QueryRepository,
	SelectQuery,
	and,
} from '@riao/dbal';
import { AuthenticationError } from './errors/authentication-error';

export interface AuthenticationOptions {
	db: Database;
	userTable?: string;
}

export abstract class AuthenticationBase<
	TUser extends DatabaseRecord = DatabaseRecord
> {
	protected db: Database;
	protected userRepo: QueryRepository<TUser>;
	protected userTable = 'users';

	public constructor(options: AuthenticationOptions) {
		for (const key in options) {
			this[key] = options[key];
		}

		this.userRepo = this.db.getQueryRepository<TUser>({
			table: this.userTable,
		});
	}

	public async findActiveUser(query: SelectQuery<TUser>): Promise<TUser> {
		const userWhere = this.userIsActive();

		if (query.where && userWhere !== undefined) {
			query.where = [this.userIsActive(), and, query.where];
		}
		else if (userWhere !== undefined) {
			query.where = this.userIsActive();
		}

		const user = await this.userRepo.findOne({
			columns: ['id'],
			...query,
		});

		if (!user) {
			throw new AuthenticationError('Could not find active user');
		}

		return user;
	}

	public async login(credentials): Promise<TUser> {
		throw new Error('No login implementation');
	}

	protected userIsActive(): Expression<TUser> {
		return undefined;
	}
}
