import { DatabaseRecordId } from '@riao/dbal';

export interface Principal {
	id?: DatabaseRecordId;
	principal_name: string;
}
