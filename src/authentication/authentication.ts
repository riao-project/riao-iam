import { and, DatabaseRecordId, Expression, SelectQuery } from '@riao/dbal';
import { Auth, AuthOptions, Principal } from '../auth';
import { KeyValExpression } from '@riao/dbal/expression/key-val-expression';

import {
	AuthenticationAttempt,
	AuthenticationProtection,
	AuthenticationProtectionResult,
	NoopAuthenticationProtection,
} from './protection';

export interface AuthenticationOptions extends AuthOptions {
	authenticationProtection?: AuthenticationProtection;
}

export abstract class Authentication<
	TPrincipal extends Principal,
> extends Auth<TPrincipal> {
	protected readonly authenticationProtection: AuthenticationProtection;

	public constructor(options: AuthenticationOptions) {
		super(options);
		this.authenticationProtection =
			options.authenticationProtection ??
			new NoopAuthenticationProtection();
	}

	protected async beforeAuthenticationAttempt(
		attempt: AuthenticationAttempt
	): Promise<AuthenticationProtectionResult> {
		return this.authenticationProtection.beforeAttempt(attempt);
	}

	protected async recordAuthenticationFailure(
		attempt: AuthenticationAttempt
	): Promise<void> {
		await this.authenticationProtection.onFailure(attempt);
	}

	protected async recordAuthenticationSuccess(
		attempt: AuthenticationAttempt
	): Promise<void> {
		await this.authenticationProtection.onSuccess(attempt);
	}

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
