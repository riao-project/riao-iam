import { AuthorizationBase, AuthorizationLookup } from './authorization-base';
import { AuthorizationError } from './errors/authorization-error';
import { AuthOptions } from './auth';

export type AttributeBasedAuthorizationOptions = AuthOptions;

export class AttributeBasedAuthorization extends AuthorizationBase {
	public constructor(options: AttributeBasedAuthorizationOptions) {
		super(options);
	}

	public async checkQuery(lookup: AuthorizationLookup): Promise<boolean> {
		return false;
	}

	public async check(lookup: AuthorizationLookup): Promise<void> {
		if (!(await this.checkQuery(lookup))) {
			throw new AuthorizationError();
		}
	}
}
