export class AuthenticationRejectedError extends Error {
	public constructor(message = 'Authentication rejected') {
		super(message);
		this.name = 'AuthenticationRejectedError';
	}
}

export class AuthenticationBlockedError extends AuthenticationRejectedError {
	public constructor(public readonly retryAfterSeconds?: number) {
		super('Authentication temporarily unavailable');
		this.name = 'AuthenticationBlockedError';
	}
}
