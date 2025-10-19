import { Database, DatabaseRecordId, Migration } from '@riao/dbal';
import { AuthenticationBase } from '../authentication-base';
import { AddPasswordColumn } from './migrations/01-add-password-column';
import { Principal } from '../../../test/principal';

export abstract class PasswordAuthentication<
	TPrincipal extends Principal,
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
	): Promise<TPrincipal | null> {
		const principal = await this.findActivePrincipal({
			where: <TPrincipal>{
				[this.loginColumn]: credentials[this.loginColumn],
			},
		});

		if (!principal) {
			return null;
		}

		const isValid = await this.hash.check(
			credentials[this.passwordColumn] as string,
			principal[this.passwordColumn] as string
		);

		return isValid ? principal : null;
	}

	public override getMigrations(db: Database): Record<string, Migration> {
		return {
			...super.getMigrations(db),
			'add-password-column': new AddPasswordColumn(db, {
				table: this.principalTable,
				passwordColumn: this.passwordColumn,
			}),
		};
	}
}
