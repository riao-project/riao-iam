import { Router } from 'express';
import { Auth } from '../auth';
import { User, AuthenticationRequest } from '../user';
import { QueryRepository } from '@riao/dbal';

export function createAuthenticationRoutes(
	fido2Auth: Auth,
	userRepo: QueryRepository<User>
): Router {
	const router = Router();

	// Begin authentication
	router.post('/begin', async (req, res) => {
		try {
			const { login }: AuthenticationRequest = req.body;

			let userID: string | undefined;

			// If login provided, find user and get their ID
			if (login) {
				const user = await userRepo.findOne({ where: { login } });
				if (!user) {
					return res.status(400).json({ error: 'User not found' });
				}
				userID = user.id!.toString();
			}

			// Generate authentication options (with or without specific user)
			const options =
				await fido2Auth.generateAuthenticationOptions(userID);

			return res.json(options);
		}
		catch (error) {
			// eslint-disable-next-line no-console
			console.error('Authentication begin error:', error);
			return res.status(500).json({
				error: 'Failed to generate authentication options',
			});
		}
	});

	// Complete authentication
	router.post('/finish', async (req, res) => {
		try {
			const { login, assertion } = req.body;

			if (!assertion) {
				return res.status(400).json({ error: 'Assertion is required' });
			}

			let principalId: string;

			if (login) {
				// Find user by login
				const user = await userRepo.findOne({ where: { login } });
				if (!user) {
					return res.status(400).json({ error: 'User not found' });
				}
				principalId = user.id!.toString();
			}
			else {
				// Extract user ID from assertion if login not provided
				// This would require parsing assertion, for now require login
				return res.status(400).json({ error: 'Username is required' });
			}

			// Verify authentication
			const user = await fido2Auth.authenticate({
				response: assertion,
				principalId,
			});

			if (user) {
				return res.json({
					verified: true,
					user: {
						id: user.id,
						login: user.login,
						displayName: user.display_name || user.login,
					},
					message: 'Authentication successful',
				});
			}
			else {
				return res.status(400).json({
					verified: false,
					error: 'Authentication verification failed',
				});
			}
		}
		catch (error) {
			// eslint-disable-next-line no-console
			console.error('Authentication finish error:', error);
			return res.status(500).json({
				verified: false,
				error: 'Authentication verification failed',
			});
		}
	});

	return router;
}
