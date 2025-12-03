import { Account } from '../../../../test/account';
import { QueryRepository } from '@riao/dbal';

/**
 * User interface extending Account with display name
 */
export interface User extends Account {
	display_name: string;
}

/**
 * Request interfaces
 */
export interface RegistrationRequest {
	login: string;
	display_name: string;
}

export interface AuthenticationRequest {
	login?: string;
}

/**
 * Helper function to find or create user
 */
export async function findOrCreateUser(
	userRepo: QueryRepository<User>,
	login: string,
	displayName?: string
): Promise<User> {
	let user = await userRepo.findOne({ where: { login } });

	if (!user) {
		await userRepo.insertOne({
			record: { login, display_name: displayName || login },
		});
		user = await userRepo.findOne({ where: { login } });
	}

	return user!;
}
