import { Router } from 'express';
import { Auth } from '../auth';

export function createStatusRoutes(fido2Auth: Auth): Router {
	const router = Router();

	// Status endpoint
	router.get('/status', (req, res) => {
		return res.json({
			server: 'FIDO2 Example Server',
			rpName: fido2Auth['rpName'],
			rpID: fido2Auth['rpID'],
			origin: fido2Auth['origin'],
			status: 'running',
		});
	});

	return router;
}
