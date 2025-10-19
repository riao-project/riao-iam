import {
	Database,
	DatabaseRecord,
	DatabaseRecordId,
	Migration,
} from '@riao/dbal';
import { AuthenticationBase } from '../authentication-base';
import { AddPasswordColumn } from './migrations/01-add-password-column';

export abstract class PasswordAuthentication<
	TPrincipal extends DatabaseRecord,
> extends AuthenticationBase<TPrincipal> {
	protected passwordColumn = 'password';

	public override async createPrincipal(
		principal: TPrincipal
	): Promise<DatabaseRecordId> {
		const hash = await this.hash.make(
			principal[this.passwordColumn] as string
		);

		return await super.createPrincipal({
			...principal,
			[this.passwordColumn]: hash,
		});
	}

	public async authenticate(
		credentials: Partial<TPrincipal>
	): Promise<boolean> {
		const principal = await this.principalRepo.findOne({
			[this.principalColumn]: credentials[this.principalColumn],
		});

		if (!principal) {
			return false;
		}

		const isValid = await this.hash.check(
			credentials[this.passwordColumn] as string,
			principal[this.passwordColumn] as string
		);

		return isValid;
	}

	public override getMigrations(db: Database): Record<string, Migration> {
		return {
			...super.getMigrations(db),
			'add-password-column': new AddPasswordColumn(db, {
				tableName: this.principalRepo.getTableName() ?? 'principals',
				passwordColumnName: this.passwordColumn,
			}),
		};
	}
}
