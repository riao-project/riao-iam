import { Fido2Authentication } from '../../../../src/authentication/authentication-fido2';
import { ColumnType, Database, Migration } from '@riao/dbal';
import { User } from './user';
import { QueryRepository } from '@riao/dbal';

/**
 * Extended FIDO2 Authentication class with custom user support
 */
export class Auth extends Fido2Authentication<User> {
	protected override principalRepo: QueryRepository<User>;

	constructor(options: {
		repo: QueryRepository<User>;
		db: Database;
		rpName: string;
		rpID: string;
		origin: string;
	}) {
		super(options);
		this.principalRepo = options.repo;
	}

	public override getMigrations(db: Database): Record<string, Migration> {
		return {
			...super.getMigrations(db),
			'add-principal-display-name': new (class extends Migration {
				override async up(): Promise<void> {
					await this.ddl.addColumns({
						table: 'principals',
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
			})(db),
		};
	}
}
