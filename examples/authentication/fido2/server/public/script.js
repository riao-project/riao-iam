const status = document.getElementById('status');

function showStatus(message, type = 'info') {
	status.innerHTML = '<div class="' + type + '">' + message + '</div>';
}

async function register() {
	try {
		const login = document.getElementById('login').value;
		const displayName = document.getElementById('displayName').value;

		if (!login) {
			showStatus('Please enter a login', 'error');
			return;
		}

		showStatus('Starting registration...', 'info');

		// Get registration options from server
		const optionsResponse = await fetch('/api/register/begin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login, displayName }),
		});

		if (!optionsResponse.ok) {
			throw new Error('Failed to get registration options');
		}

		const options = await optionsResponse.json();

		// Convert base64url strings to ArrayBuffers
		options.user.id = base64URLStringToBuffer(options.user.id);
		options.challenge = base64URLStringToBuffer(options.challenge);

		if (options.excludeCredentials) {
			options.excludeCredentials = options.excludeCredentials.map(
				(cred) => ({
					...cred,
					id: base64URLStringToBuffer(cred.id),
				})
			);
		}

		showStatus('Please complete the authentication prompt...', 'info');

		// Create credential using WebAuthn API
		console.log('options', options);
		const credential = await navigator.credentials.create({
			publicKey: options,
		});

		if (!credential) {
			throw new Error('Failed to create credential');
		}

		// Prepare credential for server
		const credentialJson = {
			id: credential.id,
			rawId: bufferToBase64URLString(credential.rawId),
			response: {
				attestationObject: bufferToBase64URLString(
					credential.response.attestationObject
				),
				clientDataJSON: bufferToBase64URLString(
					credential.response.clientDataJSON
				),
				transports: credential.response.getTransports
					? credential.response.getTransports()
					: [],
			},
			type: credential.type,
			clientExtensionResults: credential.getClientExtensionResults(),
		};

		// Send credential to server for verification
		const verifyResponse = await fetch('/api/register/finish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				login,
				credential: credentialJson,
			}),
		});

		const result = await verifyResponse.json();

		if (result.verified) {
			showStatus(
				'✅ Registration successful! You can now authenticate.',
				'success'
			);
		}
		else {
			showStatus(
				'❌ Registration failed: ' + (result.error || 'Unknown error'),
				'error'
			);
		}
	}
	catch (error) {
		console.error('Registration error:', error);
		showStatus('❌ Registration failed: ' + error.message, 'error');
	}
}

async function authenticate() {
	try {
		const login = document.getElementById('login').value;

		showStatus('Starting authentication...', 'info');

		// Get authentication options from server
		const optionsResponse = await fetch('/api/authenticate/begin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login }),
		});

		if (!optionsResponse.ok) {
			throw new Error('Failed to get authentication options');
		}

		const options = await optionsResponse.json();

		// Convert base64url strings to ArrayBuffers
		options.challenge = base64URLStringToBuffer(options.challenge);

		if (options.allowCredentials) {
			options.allowCredentials = options.allowCredentials.map((cred) => ({
				...cred,
				id: base64URLStringToBuffer(cred.id),
			}));
		}

		showStatus('Please complete the authentication prompt...', 'info');

		// Get assertion using WebAuthn API
		const assertion = await navigator.credentials.get({
			publicKey: options,
		});

		if (!assertion) {
			throw new Error('Failed to get assertion');
		}

		// Prepare assertion for server
		const assertionJson = {
			id: assertion.id,
			rawId: bufferToBase64URLString(assertion.rawId),
			response: {
				authenticatorData: bufferToBase64URLString(
					assertion.response.authenticatorData
				),
				clientDataJSON: bufferToBase64URLString(
					assertion.response.clientDataJSON
				),
				signature: bufferToBase64URLString(
					assertion.response.signature
				),
				userHandle: assertion.response.userHandle
					? bufferToBase64URLString(assertion.response.userHandle)
					: null,
			},
			type: assertion.type,
			clientExtensionResults: assertion.getClientExtensionResults(),
		};

		// Send assertion to server for verification
		const verifyResponse = await fetch('/api/authenticate/finish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				login,
				assertion: assertionJson,
			}),
		});

		const result = await verifyResponse.json();

		if (result.verified) {
			showStatus(
				'✅ Authentication successful! Welcome, ' +
					result.user.displayName +
					'!',
				'success'
			);
		}
		else {
			showStatus(
				'❌ Authentication failed: ' +
					(result.error || 'Unknown error'),
				'error'
			);
		}
	}
	catch (error) {
		console.error('Authentication error:', error);
		showStatus('❌ Authentication failed: ' + error.message, 'error');
	}
}

function base64URLStringToBuffer(base64URLString) {
	const base64 = base64URLString.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64.padEnd(
		base64.length + ((4 - (base64.length % 4)) % 4),
		'='
	);
	const binary = atob(padded);
	const buffer = new ArrayBuffer(binary.length);
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return buffer;
}

function bufferToBase64URLString(buffer) {
	const bytes = new Uint8Array(buffer);
	let str = '';
	for (const charCode of bytes) {
		str += String.fromCharCode(charCode);
	}
	const base64String = btoa(str);
	return base64String
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

// Check WebAuthn support when page loads
document.addEventListener('DOMContentLoaded', function () {
	if (!window.PublicKeyCredential) {
		showStatus('❌ WebAuthn is not supported in this browser', 'error');
	}
	else {
		showStatus('✅ WebAuthn is supported. Ready to use FIDO2!', 'success');
	}
});
