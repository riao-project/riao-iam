import { createDatabase, runMigrations } from '../../../../test/database';
import { createServer } from './server';
import { Auth } from './auth';
import { User } from './user';

// Configuration
const PORT = process.env['PORT'] || 3000;
const HOST = process.env['HOST'] || 'localhost';
const ORIGIN = `http://${HOST}:${PORT}`;

// Setup database and FIDO2 authentication
const db = createDatabase('fido2-example-v2');
const userRepo = db.getQueryRepository<User>({
	table: 'iam_accounts',
	identifiedBy: 'id',
});

const fido2Auth = new Auth({
	repo: userRepo,
	db,
	rpName: 'FIDO2 Example App',
	rpID: HOST,
	origin: ORIGIN,
});

// Initialize database
async function initializeDatabase() {
	await db.init();
	await runMigrations(db, fido2Auth);
}

// Start server
async function startServer() {
	try {
		await initializeDatabase();

		const app = createServer(fido2Auth, userRepo);

		app.listen(PORT, () => {
			// eslint-disable-next-line no-console
			console.log(`🚀 FIDO2 Example Server running at ${ORIGIN}`);
			// eslint-disable-next-line no-console
			console.log('📋 Endpoints:');
			// eslint-disable-next-line no-console
			console.log('   GET  /              - Demo page');
			// eslint-disable-next-line no-console
			console.log('   POST /api/register/begin   - Start registration');
			// eslint-disable-next-line no-console
			console.log(
				'   POST /api/register/finish  - Complete registration'
			);
			// eslint-disable-next-line no-console
			console.log(
				'   POST /api/authenticate/begin   - Start authentication'
			);
			// eslint-disable-next-line no-console
			console.log(
				'   POST /api/authenticate/finish  - Complete authentication'
			);
			// eslint-disable-next-line no-console
			console.log('   GET  /api/status    - Server status');
			// eslint-disable-next-line no-console
			console.log('');
			// eslint-disable-next-line no-console
			console.log('💡 Open your browser and navigate to the URL above!');
		});
	}
	catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
	// eslint-disable-next-line no-console
	console.log('Shutting down gracefully...');
	await db.disconnect();
	process.exit(0);
});

process.on('SIGINT', async () => {
	// eslint-disable-next-line no-console
	console.log('Shutting down gracefully...');
	await db.disconnect();
	process.exit(0);
});

// Start the server
startServer().catch((error) => {
	// eslint-disable-next-line no-console
	console.error('Failed to start server:', error);
});
