import { DatabaseRecordId } from '@riao/dbal';

export type Account = Record<string, any> & {
	id?: DatabaseRecordId;
	login: string;
};
