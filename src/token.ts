import { DatabaseRecordId } from '@riao/dbal';
import { Token } from './jwt';

export interface AccessRefreshTokens {
	access: Token;
	refresh: Token;
}

export interface AuthTokenPayload {
	type: 'access' | 'refresh';
	userId: DatabaseRecordId;
}

export interface AccessTokenPayload extends AuthTokenPayload {
	scopes: string[];
}
