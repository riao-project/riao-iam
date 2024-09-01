import 'jasmine';
import { maindb } from '../../database/main';
import {
	AuthenticationPassword,
	PasswordLogin,
} from '../../src/authentication-password';
import { Iam } from '../../src/iam';
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
		userTable: 'users',
		loginColumn: 'email',
	});

	jwt = jwt;
}

describe('IAM', async () => {
	let iam: TestIam;
	let user: { id: number };

	beforeAll(async () => {
		iam = new TestIam();

		user = <any>await maindb.query.insertOne({
			table: 'users',
			record: {
				email: 'iamtest@example.com',
				password: await iam.authn.hashPassword('password1234'),
			},
			primaryKey: 'id',
		});
	});

	async function checkAccessToken(access: string) {
		expect(await jwt.verifyAccessToken(access)).toEqual({
			userId: user.id,
			scopes: [],
		});
	}

	async function checkRefreshToken(refresh: string) {
		expect(await jwt.verifyRefreshToken(refresh)).toEqual({
			userId: user.id,
		});
	}

	it('can login', async () => {
		const { access, refresh } = await iam.login({
			login: 'iamtest@example.com',
			password: 'password1234',
		});

		await checkAccessToken(access.token);
		await checkRefreshToken(refresh.token);
	});

	it('can refresh', async () => {
		const login = await iam.login({
			login: 'iamtest@example.com',
			password: 'password1234',
		});

		const refreshed = await iam.refresh(user.id, login.refresh.token);

		await checkAccessToken(refreshed.access.token);
	});

	it('can verify access', async () => {
		const login = await iam.login({
			login: 'iamtest@example.com',
			password: 'password1234',
		});

		const result = await iam.verifyAccessToken({
			userId: user.id,
			accessToken: login.access.token,
		});

		expect(result).toEqual({
			userId: user.id,
			scopes: [],
		});
	});
});
