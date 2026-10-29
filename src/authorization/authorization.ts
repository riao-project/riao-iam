import { Auth, AuthOptions, Principal } from '../auth';

export type AuthorizationOptions = AuthOptions;

export interface AuthorizationSubject {
	id: string;
}

export interface AuthorizationRequirement {
	resource?: string | Record<string, unknown>;
	action: string;
	metadata?: Record<string, unknown>;
}

export interface AuthorizationContext<
	TSubject extends AuthorizationSubject = Principal,
> extends AuthorizationRequirement {
	principal: TSubject;
}

export interface AuthorizationResult {
	allowed: boolean;
	reason?: string;
}

export interface AuthorizationService<
	TSubject extends AuthorizationSubject = AuthorizationSubject,
> {
	evaluate(
		context: AuthorizationContext<TSubject>
	): Promise<AuthorizationResult>;
}

export abstract class Authorization<
	TPrincipal extends Principal,
	TSubject extends AuthorizationSubject = TPrincipal,
> extends Auth<TPrincipal> implements AuthorizationService<TSubject> {
	/**
	 * Evaluate authorization for a given context
	 * @param context The authorization context containing principal,
	 *  resource, action, and optional metadata
	 * @returns Authorization result with allowed status and optional reason
	 */
	public abstract evaluate(
		context: AuthorizationContext<TSubject>
	): Promise<AuthorizationResult>;

	/**
	 * Check if a principal is authorized for a specific action on a resource
	 * @param context The authorization context
	 * @returns True if authorized, false otherwise
	 */
	public async isAuthorized(
		context: AuthorizationContext<TSubject>
	): Promise<boolean> {
		const result = await this.evaluate(context);
		return result.allowed;
	}

	/**
	 * Check if a principal has permission for an action
	 * Subclasses should override this for specific authorization models
	 * @param context The authorization context
	 * @returns Authorization result
	 */
	protected async checkPermission(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		context: AuthorizationContext<TSubject>
	): Promise<AuthorizationResult> {
		// Default implementation returns false
		return {
			allowed: false,
			reason: 'No authorization model configured',
		};
	}
}
