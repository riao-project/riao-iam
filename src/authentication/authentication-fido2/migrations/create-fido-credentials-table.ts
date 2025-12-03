import { ColumnType } from '@riao/dbal';
import {
	CreateTimestampColumn,
	UpdateTimestampColumn,
} from '@riao/dbal/column-pack';
import { Migration } from '@riao/dbal';

export class CreateFido2CredentialsTableMigration extends Migration {
	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: 'iam_fido2_credentials',
			columns: [
				// Base64URL encoded credential ID from WebAuthn (primary key)
				{
					name: 'credential_id',
					type: ColumnType.VARCHAR,
					length: 1024,
					primaryKey: true,
				},
				// Reference to the account who owns this credential
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
				// CBOR-encoded public key from the authenticator
				{
					name: 'public_key',
					type: ColumnType.TEXT,
					required: true,
				},
				// Signature counter for replay attack prevention
				{
					name: 'counter',
					type: ColumnType.BIGINT,
					required: true,
				},
				// JSON array of supported authenticator transports
				{
					name: 'transports',
					// TODO: Change to JSON when/if supported
					type: ColumnType.TEXT,
					required: false,
				},
				// User-friendly name for the authenticator device
				{
					name: 'device_name',
					type: ColumnType.VARCHAR,
					length: 255,
					required: false,
				},
				CreateTimestampColumn,
				UpdateTimestampColumn,
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({
			tables: ['iam_fido2_credentials'],
		});
	}
}
