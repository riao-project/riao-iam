import express from 'express';
import path from 'path';
import { createRegistrationRoutes } from './routes/registration';
import { createAuthenticationRoutes } from './routes/authentication';
import { createMainRoutes } from './routes';
import { createStatusRoutes } from './routes/status';
import { Auth } from './auth';
import { User } from './user';
import { QueryRepository } from '@riao/dbal';

export function createServer(
	fido2Auth: Auth,
	userRepo: QueryRepository<User>
): express.Application {
	const app = express();

	// Middleware
	app.use(express.json());
	app.use(express.static(path.join(__dirname, 'public')));

	// Routes
	app.use('/', createMainRoutes());
	app.use('/api/register', createRegistrationRoutes(fido2Auth, userRepo));
	app.use(
		'/api/authenticate',
		createAuthenticationRoutes(fido2Auth, userRepo)
	);
	app.use('/api', createStatusRoutes(fido2Auth));

	return app;
}
