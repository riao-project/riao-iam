# JWT Guide

The `Jwt` class provides a secure and flexible way to generate and verify JSON Web Tokens (JWTs). It supports both symmetric signing (using a secret) and asymmetric signing (using public/private key pairs), making it suitable for various authentication and authorization scenarios.

## Table of Contents

- [Overview](#overview)
- [What is JWT?](#what-is-jwt)
- [Getting Started](#getting-started)
- [The `generateToken` Method](#the-generatetoken-method)
- [The `decodeToken` Method](#the-decodetoken-method)
- [Usage Examples](#usage-examples)
- [Symmetric vs Asymmetric Signing](#symmetric-vs-asymmetric-signing)
- [Security Considerations](#security-considerations)
- [Token Expiration and Timing](#token-expiration-and-timing)

## Overview

The `Jwt` class provides:

- **`generateToken`**: Creates a signed JWT with your payload data
- **`decodeToken`**: Verifies and decodes a JWT, returning the original payload
- **Flexible Signing**: Support for both secret-based (HMAC) and key-pair-based (asymmetric) signing
- **Configurable Expiration**: Built-in support for token expiration and "not before" times

### Why use JWT?

- **Stateless**: No server-side session storage required
- **Verifiable**: Recipients can verify the token's authenticity without server queries
- **Portable**: Can be used across different domains and services
- **Standards-based**: Follows the RFC 7519 specification
- **Flexible**: Supports multiple algorithms and key types

## What is JWT?

A JSON Web Token (JWT) consists of three parts separated by dots:

```
header.payload.signature
```

- **Header**: Specifies the token type and signing algorithm
- **Payload**: Contains your claims (data) in JSON format
- **Signature**: Cryptographic proof that the token hasn't been tampered with

Tokens are not encrypted by default—the payload is base64-encoded but readable. Use encryption if you need to hide sensitive data.

## Getting Started

### Using a Shared Secret (Symmetric)

```typescript
import { Jwt } from '@riao/iam';

const jwtManager = new Jwt({
	secret: 'your-secret-key',
	algorithm: 'HS512', // HMAC with SHA-512
	expiresIn: '1h',    // Optional: Token expires in 1 hour
});
```

### Using a Key Pair (Asymmetric)

```typescript
import { Jwt, KeyPairGenerator } from '@riao/iam';

// Generate or load a key pair
const keyGen = new KeyPairGenerator({ algorithm: 'ES512' });
const keys = keyGen.generate();

const jwtManager = new Jwt({
	...keys,                    // Includes publicKey and privateKey
	expiresIn: '1h',           // Optional: Token expires in 1 hour
	notBefore: '0s',           // Optional: Token valid immediately
});
```

## The `generateToken` Method

The `generateToken` method creates and signs a JWT with your payload data.

### Parameters

- **`data`** (TPayload): The payload object to include in the token
- **`options?`** (jwt.SignOptions): Optional signing options to override instance defaults

### Return Value

A Promise that resolves to an object with a `token` property containing the signed JWT string.

### Default Behavior

- Expiration: 15 minutes (`15m`)
- Not Before: 1 second (`1s`)
- Algorithm: Uses the algorithm specified during initialization

### Example

```typescript
import { Jwt } from '@riao/iam';

const jwtManager = new Jwt({
	secret: 'your-secret-key',
	algorithm: 'HS512',
});

// Define your payload type
interface UserClaims {
	userId: string;
	email: string;
	role: string;
}

// Generate a token
const { token } = await jwtManager.generateToken<UserClaims>({
	userId: 'user-123',
	email: 'user@example.com',
	role: 'admin',
});

console.log(token); // eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9...
```

### Custom Options

```typescript
// Override expiration for this token
const { token } = await jwtManager.generateToken(
	{
		userId: 'user-123',
		email: 'user@example.com',
	},
	{
		expiresIn: '7d', // Valid for 7 days
	}
);
```

## The `decodeToken` Method

The `decodeToken` method verifies and decodes a JWT, returning the original payload.

### Parameters

- **`token`** (string): The JWT string to verify and decode

### Return Value

A Promise that resolves to the decoded payload (TPayload).

### How it works

1. Verifies the signature using the public key or secret
2. Checks the token hasn't expired
3. Checks the "not before" time
4. Strips out internal claims (iat, nbf, exp)
5. Returns the remaining payload

### Example

```typescript
import { Jwt } from '@riao/iam';

const jwtManager = new Jwt({
	secret: 'your-secret-key',
	algorithm: 'HS512',
});

interface UserClaims {
	userId: string;
	email: string;
	role: string;
}

// Decode a token
const payload = await jwtManager.decodeToken<UserClaims>(token);

console.log(payload.userId); // 'user-123'
console.log(payload.role);   // 'admin'
```

## Usage Examples

### API Authentication

```typescript
import { Jwt } from '@riao/iam';
import express from 'express';

// Initialize JWT manager
const jwtManager = new Jwt({
	secret: process.env.JWT_SECRET,
	algorithm: 'HS512',
	expiresIn: '24h',
});

interface AuthPayload {
	userId: string;
	username: string;
}

const app = express();

// Login endpoint
app.post('/login', async (req, res) => {
	const user = await authenticateUser(req.body.username, req.body.password);
	
	if (!user) {
		return res.status(401).json({ error: 'Invalid credentials' });
	}

	// Generate token
	const { token } = await jwtManager.generateToken<AuthPayload>({
		userId: user.id,
		username: user.username,
	});

	res.json({ token });
});

// Protected endpoint middleware
app.use(async (req, res, next) => {
	const authHeader = req.headers.authorization;
	
	if (!authHeader?.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Missing token' });
	}

	try {
		const token = authHeader.slice(7);
		const payload = await jwtManager.decodeToken<AuthPayload>(token);
		req.user = payload;
		next();
	} catch (error) {
		res.status(401).json({ error: 'Invalid token' });
	}
});

// Protected route
app.get('/profile', (req, res) => {
	res.json({ userId: req.user.userId });
});
```

### Microservices Communication

```typescript
import { Jwt, KeyPairGenerator } from '@riao/iam';

// Service A (issuer)
const keyGen = new KeyPairGenerator({ algorithm: 'RS256' });
const keys = keyGen.generate();

const jwtIssuer = new Jwt({
	...keys,
	expiresIn: '1h',
});

interface ServicePayload {
	service: string;
	requestId: string;
	timestamp: number;
}

// Generate token for inter-service communication
const { token } = await jwtIssuer.generateToken<ServicePayload>({
	service: 'service-a',
	requestId: 'req-123',
	timestamp: Date.now(),
});

// Service B (verifier) - receives public key out of band
const jwtVerifier = new Jwt({
	publicKey: keys.publicKey,
	privateKey: keys.privateKey, // Actually ignored for verification
	algorithm: 'RS256',
});

// Verify the token
const payload = await jwtVerifier.decodeToken<ServicePayload>(token);
console.log(`Request from ${payload.service}`);
```

### Refresh Token Pattern

```typescript
import { Jwt } from '@riao/iam';

interface UserClaims {
	userId: string;
	username: string;
}

const jwtManager = new Jwt({
	secret: process.env.JWT_SECRET,
	algorithm: 'HS512',
	expiresIn: '15m', // Short-lived access tokens
});

// Generate access token (short-lived)
const { token: accessToken } = await jwtManager.generateToken<UserClaims>({
	userId: 'user-123',
	username: 'john',
});

// Generate refresh token (long-lived)
const refreshJwt = new Jwt({
	secret: process.env.REFRESH_JWT_SECRET,
	algorithm: 'HS512',
	expiresIn: '7d',
});

const { token: refreshToken } = await refreshJwt.generateToken<UserClaims>({
	userId: 'user-123',
	username: 'john',
});

// Return both tokens to client
res.json({
	accessToken,
	refreshToken,
});

// Later, when access token expires, use refresh token to get new access token
const refreshPayload = await refreshJwt.decodeToken<UserClaims>(refreshToken);

const { token: newAccessToken } = await jwtManager.generateToken<UserClaims>({
	userId: refreshPayload.userId,
	username: refreshPayload.username,
});

res.json({ accessToken: newAccessToken });
```

## Symmetric vs Asymmetric Signing

### Symmetric (HMAC)

**Use a shared secret key for both signing and verification.**

```typescript
const jwtManager = new Jwt({
	secret: 'shared-secret-key',
	algorithm: 'HS512',
});
```

**Advantages:**
- Simpler to implement
- Faster performance
- Good for single-system or trusted parties

**Disadvantages:**
- Secret must be shared with all verifiers
- Key compromise affects both signing and verification
- Not suitable for public verification

**Algorithms:** HS256, HS384, HS512

### Asymmetric (RSA, ECDSA)

**Use a private key to sign, public key to verify.**

```typescript
const jwtManager = new Jwt({
	privateKey: privateKey,
	publicKey: publicKey,
	algorithm: 'RS512',
});
```

**Advantages:**
- Public key can be safely distributed
- Private key only needed for signing
- Suitable for public verification
- Better for multi-service scenarios

**Disadvantages:**
- More complex setup
- Slightly slower performance
- Key management more involved

**Algorithms:** RS256, RS384, RS512, ES256, ES384, ES512, PS256, PS384, PS512

## Security Considerations

### 1. Secret Management

**Never hardcode secrets in your source code:**

```typescript
// ❌ Bad
const jwtManager = new Jwt({
	secret: 'hardcoded-secret-key',
});

// ✅ Good
const jwtManager = new Jwt({
	secret: process.env.JWT_SECRET,
});
```

### 2. Token Storage

Tokens should be stored securely:

- **In browsers**: Use `httpOnly` cookies (not localStorage) to prevent XSS attacks
- **In mobile apps**: Use secure storage mechanisms provided by the platform
- **Never log tokens**: Don't include full tokens in logs

### 3. HTTPS Only

Always transmit tokens over HTTPS to prevent interception:

```typescript
// Ensure this header is set
app.use((req, res, next) => {
	if (!req.secure && process.env.NODE_ENV === 'production') {
		return res.redirect(`https://${req.hostname}${req.url}`);
	}
	next();
});
```

### 4. Algorithm Selection

Use strong algorithms:

- **HS256+**: Acceptable for HMAC
- **RS256+, ES256+**: Recommended for asymmetric
- **Avoid**: HS256 is the minimum; prefer HS512

### 5. Expiration Times

Set appropriate expiration:

```typescript
// Access tokens: short-lived (15 minutes)
new Jwt({
	secret: process.env.JWT_SECRET,
	algorithm: 'HS512',
	expiresIn: '15m',
});

// Refresh tokens: longer-lived (7 days)
new Jwt({
	secret: process.env.REFRESH_JWT_SECRET,
	algorithm: 'HS512',
	expiresIn: '7d',
});
```

### 6. Claims Validation

Validate claims beyond signature verification:

```typescript
const payload = await jwtManager.decodeToken(token);

// Validate custom claims
if (payload.role !== 'admin') {
	throw new Error('Insufficient permissions');
}

// Validate expiration hasn't actually passed
if (Date.now() > payload.exp * 1000) {
	throw new Error('Token expired');
}
```

## Token Expiration and Timing

### Understanding Expiration

The `expiresIn` option specifies how long a token is valid:

```typescript
new Jwt({
	secret: 'secret',
	algorithm: 'HS512',
	expiresIn: '1h',      // 1 hour
	// or
	expiresIn: 3600,      // 3600 seconds
});
```

### Understanding Not Before (nbf)

The `notBefore` option specifies when a token becomes valid:

```typescript
new Jwt({
	secret: 'secret',
	algorithm: 'HS512',
	notBefore: '0s',      // Valid immediately
	// or
	notBefore: 5,         // Valid after 5 seconds
	// or
	notBefore: '5s',      // Valid after 5 seconds
});
```

This is useful for:
- Delaying token activation
- Managing token rollout
- Clock skew tolerance

### Common Time Formats

The library uses the `ms` package, supporting:

- `'2 days'`, `'1d'`, `'24h'`
- `'1h'`, `'60m'`, `'3600s'`
- Numeric values in milliseconds

### Automatic Claims

These claims are automatically added and removed:

- **`iat`** (Issued At): Token creation timestamp
- **`exp`** (Expiration Time): Token expiration timestamp
- **`nbf`** (Not Before): When token becomes valid

When you decode a token, these are automatically stripped from the returned payload.

---

For more information, see:
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [JWT Introduction & Debugger](https://jwt.io/)
