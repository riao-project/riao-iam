import 'jasmine';
import { maindb } from '../../database/main';
import {
	db,
	initTestDatabase,
	runMigrations,
	runMigrationsDown,
} from '../database';
import { AuthMigrations } from '../../src/auth/auth-migrations';

beforeAll(async () => {
	await maindb.init();

	await initTestDatabase();
	await runMigrations(db, new AuthMigrations());
	await runMigrationsDown(db, new AuthMigrations());
	await runMigrations(db, new AuthMigrations());
});

afterAll(async () => {
	await maindb.disconnect();
});
