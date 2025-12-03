import {
	Database,
	DatabaseConnectionOptions,
	Migration,
	MigrationRunner,
} from '@riao/dbal';
import { AuthMigrations } from '../src/auth/auth-migrations';
import { maindb } from '../database/main';
import { DatabasePostgres18 } from '@riao/postgres';

export function createDatabase(name: string): Database {
	return new (class extends DatabasePostgres18 {
		override name = name;

		override async init(options?: {
			connectionOptions?: DatabaseConnectionOptions;
			useSchemaCache?: boolean;
		}): Promise<void> {
			await maindb.ddl.dropDatabase({
				ifExists: true,
				name: `"${name}"`,
			});
			await maindb.ddl.createDatabase({
				name: `"${name}"`,
			});

			await super.init(options);
		}

		public override configureFromEnv(): void {
			this.env = {
				NODE_ENV: 'test',
				host: maindb.env.host,
				port: maindb.env.port,
				username: maindb.env.username,
				password: maindb.env.password,
				database: name,
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

export async function clearDatabases(): Promise<void> {}
