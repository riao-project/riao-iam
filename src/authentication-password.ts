import { DatabaseRecord } from '@riao/dbal';
import { AuthenticationBase } from './authentication-base';

import * as argon2 from 'argon2';
import { AuthenticationError } from './errors/authentication-error';

export interface PasswordLogin {
	login: string;
	password: string;
}

export class AuthenticationPassword<
	TUser extends DatabaseRecord = DatabaseRecord
> extends AuthenticationBase<TUser> {
	public async login(credentials: PasswordLogin): Promise<TUser> {
		const user = await this.findActiveUser({
			columns: ['id', 'password'],
			where: <any>{ [this.loginColumn]: credentials.login },
		});

		if (await this.verifyPassword(user.password, credentials.password)) {
			return user;
		}
		else {
			throw new AuthenticationError('Wrong password');
		}
	}

	public async hashPassword(password: string): Promise<string> {
		return await argon2.hash(password);
	}

	public async verifyPassword(
		hash: string,
		password: string
	): Promise<boolean> {
		return await argon2.verify(hash, password);
	}
}
