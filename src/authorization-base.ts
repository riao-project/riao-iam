import { DatabaseRecord, DatabaseRecordId } from '@riao/dbal';
import { AuthorizationError } from './errors/authorization-error';
import { AuthBase } from './auth';

export enum CrudActions {
	CREATE = 'c',
	READ = 'r',
	UPDATE = 'u',
	DELETE = 'd',
}

export type Action = string | CrudActions;

export interface AuthorizationLookup {
	user: DatabaseRecordId;
	action: Action;
	model?: string;
}

export abstract class AuthorizationBase<
	TUser extends DatabaseRecord = DatabaseRecord
> extends AuthBase<TUser> {
	public async check(lookup: AuthorizationLookup): Promise<void> {
		throw new AuthorizationError();
	}
}
