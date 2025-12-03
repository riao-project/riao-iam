import { ColumnType } from '@riao/dbal';
import {
	CreateTimestampColumn,
	UpdateTimestampColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export class CreateFido2ChallengesTableMigration extends Migration {
	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: 'iam_fido2_challenges',
			columns: [
				// The unique challenge string from WebAuthn (primary key)
				{
					name: 'challenge_id',
					type: ColumnType.VARCHAR,
					length: 512,
					primaryKey: true,
				},
				// Reference to the account who owns this challenge
				{
					name: 'account_id',
					type: ColumnType.UUID,
					required: true,
					fk: {
						referencesTable: 'iam_accounts',
						referencesColumn: 'id',
						onDelete: 'CASCADE',
					},
				},
				// Type of challenge: 'registration' or 'authentication'
				{
					name: 'challenge_type',
					type: ColumnType.VARCHAR,
					length: 20,
					required: true,
				},
				// Whether the challenge has been consumed/used
				{
					name: 'used',
					type: ColumnType.BOOL,
					required: true,
				},
				// When the challenge expires (typically 5 minutes)
				{
					name: 'expires_at',
					type: ColumnType.TIMESTAMP,
					required: true,
				},
				CreateTimestampColumn,
				UpdateTimestampColumn,
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({
			tables: ['iam_fido2_challenges'],
		});
	}
}
