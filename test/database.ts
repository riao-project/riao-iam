import { Database, MigrationRunner } from '@riao/dbal';
import TestDatabase from '../database/test';
import { Auth } from '../src/auth';
import { readdirSync, unlinkSync } from 'fs';

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

export async function runMigrations(db: Database, auth: Auth<any>) {
	const runner = new MigrationRunner(db);
	const migrations = await auth.getMigrations(db);
	return runner.run(migrations, (...args) => {});
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
