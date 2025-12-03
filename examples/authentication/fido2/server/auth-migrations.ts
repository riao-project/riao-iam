import { ColumnType, Migration } from '@riao/dbal';
import { AuthenticationFido2Migrations } from '../../../../src/authentication/authentication-fido2/authentication-fido2-migrations';

export class ExampleAuthMigrations extends AuthenticationFido2Migrations {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public override getMigrations(): Record<string, typeof Migration<any>> {
		return {
			...super.getMigrations(),
			'add-account-display-name': class extends Migration {
				override async up(): Promise<void> {
					await this.ddl.addColumns({
						table: 'iam_accounts',
						columns: [
							{
								name: 'display_name',
								type: ColumnType.VARCHAR,
								length: 255,
								required: false,
							},
						],
					});
				}
			},
		};
	}
}
