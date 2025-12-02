import { Router } from 'express';
import path from 'path';
import fs from 'fs';

export function createMainRoutes(): Router {
	const router = Router();

	// Serve the main demo page
	router.get('/', (req, res) => {
		// Try to find the HTML file in the source directory structure
		const possiblePaths = [
			path.join(__dirname, '../public/index.html'),
			path.join(__dirname, '../../../../public/index.html'),
			path.join(
				process.cwd(),
				'examples/authentication/fido2/server/public/index.html'
			),
		];

		let htmlPath = null;
		for (const testPath of possiblePaths) {
			if (fs.existsSync(testPath)) {
				htmlPath = testPath;
				break;
			}
		}

		if (htmlPath) {
			res.sendFile(htmlPath);
		}
		else {
			// Fallback to basic HTML if file not found
			res.send(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>FIDO2 Demo</title>
				</head>
				<body>
					<h1>FIDO2 Demo Server is Running</h1>
					<p>Server is ready but demo HTML file not found.</p>
					<p>Please check the public directory setup.</p>
				</body>
				</html>
			`);
		}
	});

	return router;
}
