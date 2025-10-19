import { DatabaseRecordId } from '@riao/dbal';
import ms from 'ms';

export interface TokenOptions {
	expiresIn: ms.StringValue;
}

export const defaultTokenOptions: TokenOptions = {
	expiresIn: '5m',
};

export interface MagicTokenPayload {
	type: 'magic-token';
	principalId: DatabaseRecordId;
}

export interface MagicTokenRecord {
	id: DatabaseRecordId;
	principal_id: DatabaseRecordId;
	created_at: Date;
	type: string;
	token: string;
}
