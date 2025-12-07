import { DatabaseRecordId } from '@riao/dbal';
import { Auth, Principal } from '../auth';

export interface AuthorizationContext<
	TPrincipal extends Principal = Principal,
> {
	principal: TPrincipal;
	resource?: string | Record<string, unknown>;
	action: string;
	metadata?: Record<string, unknown>;
}

export interface AuthorizationResult {
	allowed: boolean;
	reason?: string;
}

export interface GrantPermissionOptions {
	principalId: DatabaseRecordId;
	action: string;
	resource?: string;
	metadata?: Record<string, unknown>;
}

export interface RevokePermissionOptions {
	principalId: DatabaseRecordId;
	action: string;
	resource?: string;
	metadata?: Record<string, unknown>;
}

export abstract class Authorization<
	TPrincipal extends Principal,
> extends Auth<TPrincipal> {
	/**
	 * Evaluate authorization for a given context
	 * @param context The authorization context containing principal,
	 *  resource, action, and optional metadata
	 * @returns Authorization result with allowed status and optional reason
	 */
	public abstract evaluate(
		context: AuthorizationContext<TPrincipal>
	): Promise<AuthorizationResult>;

	/**
	 * Check if a principal is authorized for a specific action on a resource
	 * @param context The authorization context
	 * @returns True if authorized, false otherwise
	 */
	public async isAuthorized(
		context: AuthorizationContext<TPrincipal>
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
		context: AuthorizationContext<TPrincipal>
	): Promise<AuthorizationResult> {
		// Default implementation returns false
		return {
			allowed: false,
			reason: 'No authorization model configured',
		};
	}

	/**
	 * Grant a permission to a principal
	 * Subclasses should implement this based on their model
	 * @param options The grant permission options
	 */
	public abstract grantPermission(
		options: GrantPermissionOptions
	): Promise<void>;

	/**
	 * Revoke a permission from a principal
	 * Subclasses should implement this based on their model
	 * @param options The revoke permission options
	 */
	public abstract revokePermission(
		options: RevokePermissionOptions
	): Promise<void>;
}
