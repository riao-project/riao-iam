import { Database, DatabaseRecordId, Migration } from '@riao/dbal';
import { AuthenticationBase } from '../authentication-base';
import { AddPasswordColumn } from './migrations/001-add-password-column';
import { Account } from '../../../test/account';

export abstract class PasswordAuthentication<
	TAccount extends Account,
> extends AuthenticationBase<TAccount> {
	protected passwordColumn = 'password';

	public override async createAccount(
		account: TAccount
	): Promise<DatabaseRecordId> {
		const hash = await this.hash.make(
			account[this.passwordColumn] as string
		);

		return await super.createAccount({
			...account,
			[this.passwordColumn]: hash,
		});
	}

	public async authenticate(
		credentials: Partial<TAccount>
	): Promise<TAccount | null> {
		const account = await this.findActiveAccount({
			where: <TAccount>{
				[this.loginColumn]: credentials[this.loginColumn],
			},
		});

		if (!account) {
			return null;
		}

		const isValid = await this.hash.check(
			credentials[this.passwordColumn] as string,
			account[this.passwordColumn] as string
		);

		return isValid ? account : null;
	}

	public override getMigrations(db: Database): Record<string, Migration> {
		return {
			...super.getMigrations(db),
			'add-password-column': new AddPasswordColumn(db, {
				table: this.accountTable,
				passwordColumn: this.passwordColumn,
			}),
		};
	}
}
