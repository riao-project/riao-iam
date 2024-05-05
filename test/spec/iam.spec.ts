import 'jasmine';
import { maindb } from '../../database/main';
import {
	AuthenticationPassword,
	PasswordLogin,
} from '../../src/authentication-password';
import { Iam } from '../../src/iam';
import { createUsersTable } from '../create-test-users-table';
import { Jwt } from '../../src/jwt';
import { KeyPairGenerator } from '../../src/keypair';

const keygen = new KeyPairGenerator({ algorithm: 'ES256' });
const keypair = keygen.generate();

const jwt: Jwt = new Jwt({
	algorithm: 'ES256',
	publicKey: keypair.publicKey,
	privateKey: keypair.privateKey,
	notBefore: 0,
});

class TestIam extends Iam<PasswordLogin> {
	authn = new AuthenticationPassword({
		db: maindb,
		userTable: 'iam_users',
	});

	jwt = jwt;
}

describe('IAM', async () => {
	let iam: TestIam;

	beforeAll(async () => {
		await createUsersTable('iam_users');

		iam = new TestIam();

		await maindb.query.insertOne({
			table: 'iam_users',
			record: {
				email: 'test@example.com',
				password: await iam.authn.hashPassword('password1234'),
			},
			primaryKey: 'id',
		});
	});

	async function checkTokens(access: string, refresh: string) {
		expect(await jwt.verifyAccessToken(access)).toEqual({
			userId: 1,
			scopes: [],
		});

		expect(await jwt.verifyRefreshToken(refresh)).toEqual({
			userId: 1,
		});
	}

	it('can login', async () => {
		const { access, refresh } = await iam.login({
			login: 'test@example.com',
			password: 'password1234',
		});

		checkTokens(access, refresh);
	});

	it('can refresh', async () => {
		const login = await iam.login({
			login: 'test@example.com',
			password: 'password1234',
		});

		const refreshed = await iam.refresh(1, login.refresh);

		checkTokens(refreshed.access, refreshed.refresh);
	});

	it('can verify access', async () => {
		const login = await iam.login({
			login: 'test@example.com',
			password: 'password1234',
		});

		const result = await iam.verifyAccessToken({
			userId: 1,
			accessToken: login.access,
		});

		expect(result).toEqual({
			userId: 1,
			scopes: [],
		});
	});
});
