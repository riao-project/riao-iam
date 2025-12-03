import { Migration } from '@riao/dbal';
import { AuthMigrations } from '../../auth/auth-migrations';
import { AddPasswordColumn } from './migrations/001-add-password-column';

export class AuthenticationPasswordMigrations extends AuthMigrations {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	override getMigrations(): Record<string, typeof Migration<any>> {
		return {
			...super.getMigrations(),
			'add-password-column': AddPasswordColumn,
		};
	}
}
