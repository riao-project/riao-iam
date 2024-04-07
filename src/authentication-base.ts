import {
	Database,
	DatabaseRecord,
	Expression,
	QueryRepository,
	SelectQuery,
	and,
} from '@riao/dbal';
import { AuthenticationError } from './errors/authentication-error';
import { AuthBase, AuthOptions } from './auth';

export type AuthenticationOptions = AuthOptions;

export abstract class AuthenticationBase<
	TUser extends DatabaseRecord = DatabaseRecord
> extends AuthBase<TUser> {
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
