import { Router } from 'express';
import { Auth } from '../auth';
import { User, RegistrationRequest, findOrCreateUser } from '../user';
import { QueryRepository } from '@riao/dbal';

export function createRegistrationRoutes(
	fido2Auth: Auth,
	userRepo: QueryRepository<User>
): Router {
	const router = Router();

	// In-memory user session store (use Redis/database in production)
	const userSessions = new Map<string, User>();

	// Begin registration
	router.post('/begin', async (req, res) => {
		try {
			const { login, display_name: displayName }: RegistrationRequest =
				req.body;

			if (!login) {
				return res.status(400).json({ error: 'Username is required' });
			}

			// Find or create user
			const user = await findOrCreateUser(userRepo, login, displayName);

			// Generate registration options
			const options = await fido2Auth.generateRegistrationOptions(user);

			// Store user in session (use Redis/database in production)
			const sessionId = Math.random().toString(36);
			userSessions.set(sessionId, user);

			return res.json({
				...options,
				sessionId, // Include session ID for client to send back
			});
		}
		catch (error) {
			// eslint-disable-next-line no-console
			console.error('Registration begin error:', error);
			return res.status(500).json({
				error: 'Failed to generate registration options',
			});
		}
	});

	// Complete registration
	router.post('/finish', async (req, res) => {
		try {
			const { login, credential } = req.body;

			if (!login || !credential) {
				return res
					.status(400)
					.json({ error: 'Username and credential are required' });
			}

			// Find user
			const user = await userRepo.findOne({ where: { login: login } });
			if (!user) {
				return res.status(400).json({ error: 'User not found' });
			}

			// Verify registration
			const verification = await fido2Auth.verifyRegistration(
				user,
				credential
			);

			if (verification.verified) {
				return res.json({
					verified: true,
					message: 'Registration successful',
				});
			}
			else {
				return res.status(400).json({
					verified: false,
					error: 'Registration verification failed',
				});
			}
		}
		catch (error) {
			// eslint-disable-next-line no-console
			console.error('Registration finish error:', error);
			return res.status(500).json({
				verified: false,
				error: 'Registration verification failed',
			});
		}
	});

	return router;
}
