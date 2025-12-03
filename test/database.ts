import { Database, Migration, MigrationRunner } from '@riao/dbal';
import TestDatabase from '../database/test';
import { Auth } from '../src/auth';
import { readdirSync, unlinkSync } from 'fs';
import { AuthMigrations } from '../src/auth/auth-migrations';

export function createDatabase(name: string): Database {
	return new (class extends TestDatabase {
		override name = name;

		public override configureFromEnv(): void {
			this.env = {
				NODE_ENV: 'test',
				host: '',
				port: 0,
				username: '',
				password: '',
				database: `test/databases/${this.name}.db`,
			};
		}
	})();
}

export async function runMigrations(
	db: Database,
	authMigrations: AuthMigrations
) {
	const runner = new MigrationRunner(db);
	const migrations = Object.entries(authMigrations.getMigrations()).reduce(
		(acc, [key, MigrationClass]) => {
			acc[key] = new MigrationClass(db);
			return acc;
		},
		{} as Record<string, Migration>
	);

	return runner.run(migrations);
}

export async function clearDatabases(): Promise<void> {
	readdirSync('test/databases').forEach((file) => {
		if (file.endsWith('.db')) {
			const dbPath = `test/databases/${file}`;
			try {
				unlinkSync(dbPath);
			}
			catch (err) {
				console.error(`Failed to delete database file ${dbPath}:`, err);
			}
		}
	});
}
