import { ColumnType, Database } from '@riao/dbal';
import { CreateTimestampColumn } from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export interface Fido2ChallengesTableOptions {
	table: string;
	challengeIdColumn: string;
	principalIdColumn: string;
	challengeTypeColumn: string;
	expiresAtColumn: string;
	usedColumn: string;
	principalTable: string;
	principalTableIdColumn: string;
}

export class CreateFido2ChallengesTableMigration extends Migration {
	protected override options: Fido2ChallengesTableOptions = {
		table: 'fido2_challenges',
		challengeIdColumn: 'challenge_id',
		principalIdColumn: 'principal_id',
		challengeTypeColumn: 'challenge_type',
		expiresAtColumn: 'expires_at',
		usedColumn: 'used',
		principalTable: 'principals',
		principalTableIdColumn: 'id',
	};

	public constructor(
		db: Database,
		options: Partial<Fido2ChallengesTableOptions>
	) {
		super(db, options);
		this.options = { ...this.options, ...options };
	}

	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: this.options.table,
			columns: [
				// The unique challenge string from WebAuthn (primary key)
				{
					name: this.options.challengeIdColumn,
					type: ColumnType.VARCHAR,
					length: 512,
					primaryKey: true,
				},
				// Reference to the principal who owns this challenge
				{
					name: this.options.principalIdColumn,
					type: ColumnType.BIGINT,
					required: true,
					fk: {
						referencesTable: this.options.principalTable,
						referencesColumn: this.options.principalTableIdColumn,
						onDelete: 'CASCADE',
					},
				},
				// Type of challenge: 'registration' or 'authentication'
				{
					name: this.options.challengeTypeColumn,
					type: ColumnType.VARCHAR,
					length: 20,
					required: true,
				},
				CreateTimestampColumn,
				// Whether the challenge has been consumed/used
				{
					name: this.options.usedColumn,
					type: ColumnType.BOOL,
					required: true,
				},
				// When the challenge expires (typically 5 minutes)
				{
					name: this.options.expiresAtColumn,
					type: ColumnType.TIMESTAMP,
					required: true,
				},
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({
			tables: [this.options.table],
		});
	}
}
