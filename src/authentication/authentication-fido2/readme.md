# FIDO2/WebAuthn Authentication Implementation

This implementation provides complete FIDO2/WebAuthn authentication support using the SimpleWebAuthn library, with database persistence and full lifecycle management.

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication Flows](#authentication-flows)
- [Usage Examples](#usage-examples)  
- [Security Considerations](#security-considerations)
- [Testing](#testing)

## Overview

This FIDO2 implementation provides passwordless authentication using WebAuthn standards. It supports:

- **Biometric Authentication**: Fingerprint, Face ID, Windows Hello
- **Hardware Security Keys**: YubiKey, Titan Security Keys
- **Platform Authenticators**: Built-in device authenticators
- **Multi-Device Support**: Multiple credentials per user
- **Cross-Platform Compatibility**: Works across browsers and platforms

### Key Features

- ✅ Complete WebAuthn registration and authentication flows
- ✅ Database persistence with proper challenge lifecycle management
- ✅ Multi-credential support per account
- ✅ Automatic challenge expiration and cleanup
- ✅ Integration with riao framework
- ✅ Type-safe TypeScript implementation
- ✅ Comprehensive test coverage

### Core Components

1. **Fido2Authentication Class**: Main authentication handler
2. **Database Schema**: Two tables for challenges and credentials  
3. **SimpleWebAuthn Integration**: Industry-standard WebAuthn library
4. **Challenge Management**: Temporary challenge storage and lifecycle
5. **Credential Repository**: Persistent authenticator credential storage

## Database Schema

The implementation uses two tables for managing the FIDO2 authentication lifecycle:

### fido2_challenges

Stores temporary challenges during registration/authentication flows. Challenges auto-expire after 5 minutes, and are single-use only  

### fido2_credentials

Stores persistent authenticator credentials

> 📋 **Schema Details**: See migration files in [`./migrations/`](./migrations/)

## API Reference

### Configuration
The `Fido2Authentication` class requires configuration for your Relying Party (RP) information and database connection:

- **`rpName`**: Your application name (shown to users)
- **`rpID`**: Your domain (must match the origin domain)  
- **`origin`**: Your application URL (must be HTTPS in production)
- **`repo`**: Account repository for user management
- **`db`**: Database instance for challenge/credential storage

> 🔍 **Type Definitions**: See [`Fido2AuthenticationOptions`](./authentication-fido2.ts) interface for complete configuration options.

### Core Methods

The implementation provides methods for the complete FIDO2 lifecycle:

#### Registration Flow
- **`generateRegistrationOptions(account)`**: Creates WebAuthn registration options and stores challenge
- **`verifyRegistration(account, response)`**: Verifies WebAuthn response and stores credential

#### Authentication Flow  
- **`generateAuthenticationOptions(userID?)`**: Creates authentication challenge (with or without specific user)
- **`authenticate(credentials)`**: Verifies authentication response and returns account

#### Account Management
- **`createAccount(account)`**: Creates user and auto-generates registration challenge

> 📚 **Method Details**: See the [class implementation](./authentication-fido2.ts)

## Authentication Flows

### Registration Flow

Enroll a new authenticator (fingerprint, security key, etc.) for a user .

**Steps**:
1. **Generate Options**: Server creates registration challenge and WebAuthn options
2. **Client Registration**: Browser/app prompts user for biometric/PIN and creates credential  
3. **Verify Registration**: Server validates the response and stores credential

```typescript
// 1. Server generates options
const options = await auth.generateRegistrationOptions(account);

// 2. Client creates credential (browser WebAuthn API)  
const credential = await navigator.credentials.create({ publicKey: options });

// 3. Server verifies and stores
const result = await auth.verifyRegistration(account, credential);
```

### Authentication Flow

Authenticate a user using an existing credential (passwordless login)

**Steps**:
1. **Generate Challenge**: Server creates authentication challenge (optionally for specific user)
2. **Client Authentication**: Browser/app prompts for biometric/PIN to sign challenge
3. **Verify Authentication**: Server validates signature and returns authenticated user

```typescript
// 1. Server generates challenge  
const options = await auth.generateAuthenticationOptions(userID); // or no param

// 2. Client signs challenge (browser WebAuthn API)
const assertion = await navigator.credentials.get({ publicKey: options });

// 3. Server verifies signature
const account = await auth.authenticate({ response: assertion, accountId: userID });
```

## Usage Examples

### Basic Setup

```typescript
import { Fido2Authentication } from './authentication-fido2';

// Configure for your application
const fido2Auth = new Fido2Authentication({
  repo: accountRepo,        // Your user repository  
  db,                         // RIAO database instance
  rpName: 'My App',          // Shown to users during registration
  rpID: 'myapp.com',         // Your domain
  origin: 'https://myapp.com' // Your app URL (HTTPS in prod)
});

// Setup database tables
const migrations = fido2Auth.getMigrations(db);
await db.runMigrations(migrations);
```

> 💡 **Complete Examples**: See the [test file](../../../test/spec/authentication/authentication-fido2.spec.ts) for comprehensive usage examples, including Express.js integration patterns and client-side WebAuthn code.

### Integration Patterns

**Server-Side**: Create REST endpoints for `/register/begin`, `/register/finish`, `/authenticate/begin`, `/authenticate/finish`  
**Client-Side**: Use browser WebAuthn API (`navigator.credentials.create()` and `navigator.credentials.get()`)  
**Data Flow**: JSON serialization with proper Base64 encoding for binary data

## Security Considerations

### Challenge Management

- **Expiration**: Challenges automatically expire after 5 minutes
- **Single Use**: Each challenge can only be used once
- **Cryptographic Security**: Challenges are generated by SimpleWebAuthn with proper entropy

### Credential Storage

- **Counter Protection**: Authenticator counters prevent replay attacks
- **Public Key Security**: Only public keys are stored, never private keys
- **Cascade Deletion**: Credentials are automatically cleaned up when accounts are deleted

### Transport Security

- **HTTPS Required**: WebAuthn requires secure contexts (HTTPS in production)
- **Origin Validation**: Strict origin checking prevents credential theft
- **Cross-Origin Protection**: Credentials are bound to specific domains

### Best Practices

1. **Always use HTTPS** in production environments
2. **Validate origins** strictly to prevent phishing attacks
3. **Implement rate limiting** on authentication endpoints
4. **Clean up expired challenges** regularly (though this happens automatically)
5. **Use secure session management** after successful authentication
6. **Implement proper error handling** without revealing sensitive information

### Attack Mitigation

- **Replay Attacks**: Prevented by counter validation
- **Phishing**: Prevented by origin binding and cryptographic verification
- **Man-in-the-Middle**: Prevented by HTTPS and challenge-response protocol
- **Credential Theft**: Impossible - only public keys are stored
- **Brute Force**: Not applicable - uses cryptographic proofs
