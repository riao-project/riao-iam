import { ColumnType, Database } from '@riao/dbal';
import {
	CreateTimestampColumn,
	UpdateTimestampColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export interface Fido2CredentialsTableOptions {
	table: string;
	credentialIdColumn: string;
	accountIdColumn: string;
	publicKeyColumn: string;
	counterColumn: string;
	transportsColumn: string;
	deviceNameColumn: string;
	accountTable: string;
	accountTableIdColumn: string;
}

export class CreateFido2CredentialsTableMigration extends Migration {
	protected override options: Fido2CredentialsTableOptions = {
		table: 'fido2_credentials',
		credentialIdColumn: 'credential_id',
		accountIdColumn: 'account_id',
		publicKeyColumn: 'public_key',
		counterColumn: 'counter',
		transportsColumn: 'transports',
		deviceNameColumn: 'device_name',
		accountTable: 'accounts',
		accountTableIdColumn: 'id',
	};

	public constructor(
		db: Database,
		options: Partial<Fido2CredentialsTableOptions>
	) {
		super(db, options);
		this.options = { ...this.options, ...options };
	}

	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: this.options.table,
			columns: [
				// Base64URL encoded credential ID from WebAuthn (primary key)
				{
					name: this.options.credentialIdColumn,
					type: ColumnType.VARCHAR,
					length: 1024,
					primaryKey: true,
				},
				// Reference to the account who owns this credential
				{
					name: this.options.accountIdColumn,
					type: ColumnType.BIGINT,
					required: true,
					fk: {
						referencesTable: this.options.accountTable,
						referencesColumn: this.options.accountTableIdColumn,
						onDelete: 'CASCADE',
					},
				},
				CreateTimestampColumn,
				UpdateTimestampColumn,
				// CBOR-encoded public key from the authenticator
				{
					name: this.options.publicKeyColumn,
					type: ColumnType.TEXT,
					required: true,
				},
				// Signature counter for replay attack prevention
				{
					name: this.options.counterColumn,
					type: ColumnType.BIGINT,
					required: true,
				},
				// JSON array of supported authenticator transports
				{
					name: this.options.transportsColumn,
					// TODO: Change to JSON when/if supported
					type: ColumnType.TEXT,
					required: false,
				},
				// User-friendly name for the authenticator device
				{
					name: this.options.deviceNameColumn,
					type: ColumnType.VARCHAR,
					length: 255,
					required: false,
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
