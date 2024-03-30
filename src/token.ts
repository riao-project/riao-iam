import { DatabaseRecordId } from '@riao/dbal';

export interface AccessRefreshTokens {
	access: string;
	refresh: string;
}

export interface TokenPayload {
	type: 'access' | 'refresh';
	userId: DatabaseRecordId;
}

export interface AccessTokenPayload extends TokenPayload {
	scopes: string;
}
