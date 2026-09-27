export interface AuthenticationAttempt {
	scheme: string;
	subject: string;
	metadata?: Record<string, unknown>;
}

export interface AuthenticationProtectionResult {
	allowed: boolean;
	retryAfterSeconds?: number;
}

export interface AuthenticationProtection {
	beforeAttempt(
		attempt: AuthenticationAttempt
	): Promise<AuthenticationProtectionResult>;
	onFailure(attempt: AuthenticationAttempt): Promise<void>;
	onSuccess(attempt: AuthenticationAttempt): Promise<void>;
}

export class NoopAuthenticationProtection implements AuthenticationProtection {
	public async beforeAttempt(): Promise<AuthenticationProtectionResult> {
		return { allowed: true };
	}

	public async onFailure(): Promise<void> {}

	public async onSuccess(): Promise<void> {}
}