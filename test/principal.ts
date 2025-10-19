import { DatabaseRecordId } from '@riao/dbal';

export type Principal = Record<string, any> & {
	id?: DatabaseRecordId;
	login: string;
};
