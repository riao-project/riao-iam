# Authentication Base Class & Custom Driver Guide

## Overview

The **Authentication base class** is an abstract class that extends the `Auth` class and provides a framework for building custom authentication drivers. It handles principal management, credential validation, and active principal queries with extensibility in mind.

## Architecture

### Class Hierarchy

```
Auth<TPrincipal>
  └── Authentication<TPrincipal> (abstract)
        └── Your Custom Authentication Driver
```

## Core Concepts

### Generic Type Parameter: `TPrincipal`

The Authentication class is generic over a `TPrincipal` type. This allows you to work with any principal structure while maintaining type safety.

**Default Principal Interface:**

```typescript
interface Principal {
	id: string;
	type: 'user' | 'service' | 'system' | 'bot';
	login: string;
	name: string;
	create_timestamp: Date;
	deactivate_timestamp?: Date;
}
```

## Base Class Methods

### Public Methods

#### 1. `createPrincipal(principal: Omit<TPrincipal, 'id' | 'create_timestamp'>): Promise<DatabaseRecordId>`

Creates a new principal in the database.

**Parameters:**
- `principal` - Principal data without `id` and `create_timestamp` (automatically generated)

**Returns:** The ID of the created principal

**Example:**
```typescript
const id = await auth.createPrincipal({
	login: 'john.doe',
	name: 'John Doe',
	type: 'user',
	deactivate_timestamp: undefined
});
```

#### 2. `authenticate(credentials: any): Promise<TPrincipal | null>` (Abstract)

**Must be implemented** by your custom driver. This is where you implement your authentication logic (password verification, OAuth, JWT validation, etc.).

**Parameters:**
- `credentials` - Any authentication credential format (flexible to support different schemes)

**Returns:** The authenticated principal or null if authentication fails

Ordinary rejection (invalid, expired, missing, inactive, or blocked credentials) returns `null`. Database, cryptographic configuration, provider transport, and other operational failures must reject with the original error. Do not use a broad catch to turn every exception into invalid credentials.

APIs with a different success shape, such as OAuth2 token exchange, can throw `AuthenticationRejectedError` for expected rejection or `AuthenticationBlockedError` with `retryAfterSeconds` for a temporary block. HTTP/OAuth2 adapters translate these framework-neutral errors; the drivers do not depend on api-machine or Express.

For an implementation with protection hooks, active-principal lookup, and
post-persistence success recording, see **Step 2: Create Your Driver Class**
below. Password hashes belong to your credential store, not the base Principal.

#### 3. `findActivePrincipal(query: SelectQuery<TPrincipal>): Promise<TPrincipal | null>`

Finds a principal that passes the active status check. Automatically combines the provided query with the result of `isActiveQuery()`.

**Parameters:**
- `query` - A DBAL SelectQuery object specifying search criteria

**Returns:** The matching active principal or null

**Query Combination Logic:**
- If both `isActiveQuery()` and `query.where` exist, they are combined with `AND`
- If only `isActiveQuery()` exists, it's used alone
- If only `query.where` exists, it's used alone

**Example:**
```typescript
const user = await auth.findActivePrincipal({
	where: { login: 'john.doe' }
});
```

#### 4. `deactivatePrincipal(principalId: DatabaseRecordId): Promise<void>`

Deactivates a principal by setting its `deactivate_timestamp` to the current date/time. This implements soft-delete semantics without removing data.

**Parameters:**
- `principalId` - The ID of the principal to deactivate

**Returns:** void

**Example:**
```typescript
await auth.deactivatePrincipal(principalId);

// Deactivated principals will no longer be found by findActivePrincipal
const principal = await auth.findActivePrincipal({
	where: { id: principalId }
});
expect(principal).toBeNull();
```

### Protected Methods

#### Authentication Protection Hooks

Drivers can call `beforeAuthenticationAttempt()`, `recordAuthenticationFailure()`, and `recordAuthenticationSuccess()` to integrate an `AuthenticationProtection` implementation.

An `allowed: false` result means the driver must stop before looking up a principal or verifying credentials. Under the base `authenticate(): Promise<TPrincipal | null>` contract, return `null` and do not invoke either recording hook: a denied request is not a failed credential
check. For allowed attempts, missing, inactive, or invalid credentials invoke `recordAuthenticationFailure()` once. Success invokes `recordAuthenticationSuccess()` once, after required persistence completes. Operational failures invoke neither recording hook. An existing local lockout also skips credential verification and both recording hooks.

```typescript
public async authenticate(credentials: Credentials): Promise<Principal | null> {
	const attempt = {
		scheme: 'password',
		subject: credentials.login,
	};
	const protection = await this.beforeAuthenticationAttempt(attempt);

	if (!protection.allowed) {
		return null;
	}

	const principal = await this.verifyCredentials(credentials);
	if (!principal) {
		await this.recordAuthenticationFailure(attempt);
		return null;
	}

	await this.recordAuthenticationSuccess(attempt);
	return principal;
}
```

`retryAfterSeconds` is advisory delay information, in seconds, for the caller.
The base return type cannot carry it: `authenticate()` returns `null` for a
block. Token-exchange APIs use `AuthenticationBlockedError` to retain the delay.
An application requiring the distinction for another driver must capture the
protection decision in its authentication service and map it at the boundary:

```typescript
interface AuthenticationDeniedResponse {
	authenticated: false;
	reason: 'locked_out';
	retryAfterSeconds?: number;
}
```

For an HTTP API, temporary blocking can map to `429 Too Many Requests` and
`Retry-After`. OAuth2 token endpoints should use their protocol's error response.
Avoid revealing whether the subject identifies an existing principal.

#### `isActiveQuery(): undefined | Expression<TPrincipal>`

Defines what makes a principal "active". Called by `findActivePrincipal()` to automatically filter results.

**Default Implementation:** Filters for principals where `deactivate_timestamp` is `null` (not deactivated)

```typescript
protected isActiveQuery(): Expression<TPrincipal> {
	return { deactivate_timestamp: null };
}
```

**Returns:** A DBAL Expression that filters for active principals

**Example Override - Custom Active Status:**
```typescript
protected isActiveQuery(): Expression<Principal> {
	return {
		deactivate_timestamp: null,
		type: { $in: ['user', 'admin'] }
	};
}
```

**Note:** The default implementation automatically filters out deactivated principals. Override only if you need additional filtering logic.

## Properties

- **`principalRepo`** (public) - QueryRepository for direct database access to principals
- **`loginColumn`** (protected) - Login column name (default: `'login'`)

The base constructor creates `principalRepo` for `iam_principals`, identified
by `id`. It does not expose `principalTable` or `principalIdColumn` overrides.

## Building a Custom Authentication Driver

### Step 1: Define Your Principal Type

If using the default Principal, skip this step. Otherwise, extend DatabaseRecord:

```typescript
interface CustomPrincipal extends DatabaseRecord {
	id: string;
	login: string;
	email: string;
	password_hash: string;
	type: 'user' | 'admin';
	create_timestamp: Date;
	is_active: boolean;
}
```

### Step 2: Create Your Driver Class

```typescript
import { Authentication } from '@riao/iam/authentication';
import { AuthenticationOptions } from '@riao/iam/authentication';
import { Principal } from '@riao/iam/auth';

export abstract class CustomAuthDriver extends Authentication<Principal> {
	constructor(options: AuthenticationOptions) {
		super(options);
	}

	/**
	 * Implement your authentication logic here
	 * This is called to verify credentials against a principal
	 */
	public async authenticate(credentials: {
		login: string;
		password: string;
	}): Promise<Principal | null> {
		const attempt = { scheme: 'custom', subject: credentials.login };
		if (!(await this.beforeAuthenticationAttempt(attempt)).allowed) {
			return null;
		}
		const principal = await this.findActivePrincipal({
			where: { login: credentials.login }
		});

		if (!principal) {
			await this.recordAuthenticationFailure(attempt);
			return null;
		}

		// Verify the password (implement your own verification)
		const isValid = await this.verifyPassword(
			credentials.password,
			principal
		);

		if (!isValid) {
			await this.recordAuthenticationFailure(attempt);
			return null;
		}
		// Complete credential-specific persistence before recording success.
		await this.persistSuccess(principal);
		await this.recordAuthenticationSuccess(attempt);
		return principal;
	}

	protected abstract verifyPassword(
		password: string, principal: Principal
	): Promise<boolean>;
	protected abstract persistSuccess(principal: Principal): Promise<void>;
}
```

Implement the verifier using your credential store and supported cryptographic
library; the IAM base class does not supply a hash service. Operational failures
from lookup, verification, persistence, or protection must propagate. See the
authentication template's example and isolated contract tests for a runnable
credential-format-neutral pattern.

### Step 3: Create Migrations for Your Tables

Create a migration that extends the base principals table with your custom columns:

```typescript
import { Migration, ColumnType } from '@riao/dbal';
import {
	CreateTimestampColumn,
	NameColumn,
	UsernameColumn,
	UUIDKeyColumn,
} from '@riao/dbal/column-pack';

export class CreateCustomPrincipalsTableMigration extends Migration {
	override async up(): Promise<void> {
		await this.ddl.createTable({
			name: 'iam_principals',
			columns: [
				UUIDKeyColumn,
				{
					name: 'type',
					type: ColumnType.VARCHAR,
					length: 20,
					required: true,
				},
				{
					...UsernameColumn,
					name: 'login',
					required: true,
				},
				{ ...NameColumn, required: true },
				// Your custom columns
				{
					name: 'email',
					type: ColumnType.VARCHAR,
					length: 255,
					required: true,
					unique: true,
				},
				{
					name: 'password_hash',
					type: ColumnType.TEXT,
					required: true,
				},
				{
					name: 'is_active',
					type: ColumnType.BOOLEAN,
					required: true,
					default: true,
				},
				CreateTimestampColumn,
				{
					name: 'deactivate_timestamp',
					type: ColumnType.TIMESTAMP,
				},
			],
		});
	}

	override async down(): Promise<void> {
		await this.ddl.dropTable({
			tables: ['iam_principals'],
		});
	}
}
```

### Step 4: Register Your Migrations

```typescript
import { Migration } from '@riao/dbal';
import { CreateCustomPrincipalsTableMigration } from './migrations/001-create-custom-principals-table';

export class CustomAuthMigrations {
	public getMigrations(): Record<string, typeof Migration<any>> {
		return {
			'create-custom-principals-table': CreateCustomPrincipalsTableMigration,
		};
	}
}
```

### Step 5: Use Your Driver

```typescript
import { Database } from '@riao/dbal';
import { AuthenticationOptions } from '@riao/iam/authentication';
import { CustomAuthDriver } from './drivers/custom-auth-driver';

// Supply your initialized database and concrete credential-specific driver.
declare const db: Database;
declare function createAuth(options: AuthenticationOptions): CustomAuthDriver;

const auth = createAuth({
	db,
	authenticationProtection: {
		beforeAttempt: async () => ({ allowed: true }),
		onFailure: async () => {},
		onSuccess: async () => {},
	},
});

// Create a principal
const principalId = await auth.createPrincipal({
	login: 'john.doe',
	name: 'John Doe',
	type: 'user',
});

// Authenticate
const principal = await auth.authenticate({
	login: 'john.doe',
	password: 'user-password'
});

// Find active principal
const user = await auth.findActivePrincipal({
	where: { login: 'john.doe' }
});

// Deactivate a principal (soft delete)
await auth.deactivatePrincipal(principalId);

// After deactivation, the principal won't be found by findActivePrincipal
const deactivatedUser = await auth.findActivePrincipal({
	where: { login: 'john.doe' }
});
// deactivatedUser will be null
```

## Advanced Patterns

### Pattern 1: Deactivation Management

The framework uses soft-delete semantics - deactivated principals are marked with a `deactivate_timestamp` rather than deleted. This preserves audit trails and historical data.

```typescript
// Deactivate a principal (soft delete)
await auth.deactivatePrincipal(principalId);

// The default isActiveQuery filters them out automatically
const principal = await auth.findActivePrincipal({
	where: { login: 'john.doe' }
});
// Returns null if the principal is deactivated

// But the data still exists in the database for auditing
const directQuery = await auth.principalRepo.findOne({
	where: { id: principalId }
});
// Returns the deactivated principal with deactivate_timestamp set
```

### Pattern 2: Role-Based Active Query

```typescript
protected isActiveQuery(): Expression<Principal> {
	return {
		deactivate_timestamp: null,
		type: { $in: ['user', 'admin'] }
	};
}
```

### Pattern 3: Custom Credential Format

```typescript
export interface JWTCredentials {
	token: string;
}

public async authenticate(credentials: JWTCredentials): Promise<Principal | null> {
	let decoded: { sub: string };
	try {
		decoded = await this.verifyJWT(credentials.token);
	} catch (error) {
		if (isTokenValidationError(error)) {
			return null;
		}
		throw error;
	}
	return this.findActivePrincipal({ where: { id: decoded.sub } });
}

private async verifyJWT(token: string): Promise<{ sub: string }> {
	// Your JWT verification logic
}
```

`isTokenValidationError` is exported by `@riao/crypto`. Implement `verifyJWT`
with a supported verifier and validate claim shapes before resolving a principal.
Issuer and audience restrictions belong to trusted verifier configuration, never
caller-supplied credentials. Optional issuer/audience support in the shared JWT
helper is a separate feature, not part of this core revamp. Apply the protection
and recording lifecycle shown above around verification. Never accept an
unverified claim as an authenticated identity.

### Application integration

Return the actual active principal to an api-machine authentication adapter.
For session-based login, persist that principal (or a trusted ID subsequently
resolved to an active principal) and expose it as `session.principal`.
Setting only `authenticated = true` is insufficient for authorization.
Password, magic-token, WebAuthn, and SSO login need not become OAuth2 bearer
authentication. Provider tokens can target provider APIs, not your application.

### Pattern 4: OAuth / External Provider

For authorization-code SSO callbacks, require and validate browser-bound state
before exchanging the code. The SSO drivers require both `code` and `state`;
provider access tokens in the generic example below are not application API
bearer credentials.

```typescript
export interface OAuthCredentials {
	provider: 'google' | 'github';
	accessToken: string;
}

public async authenticate(credentials: OAuthCredentials): Promise<Principal | null> {
	const profile = await this.fetchProfile(credentials.provider, credentials.accessToken);
	
	// Find or create principal
	let principal = await this.findActivePrincipal({
		where: { login: profile.email }
	});

	if (!principal) {
		const existing = await this.principalRepo.findOne({
			where: { login: profile.email }
		});
		if (existing) {
			return null; // Do not provision a replacement for an inactive identity.
		}
		const id = await this.createPrincipal({
			login: profile.email,
			name: profile.name,
			type: 'user',
		});
		principal = await this.findActivePrincipal({ where: { id } });
		if (!principal) {
			throw new Error('Provisioned principal could not be resolved');
		}
	}

	return principal;
}

private async fetchProfile(provider: string, token: string): Promise<any> {
	// Fetch user profile from OAuth provider
}
```

### Pattern 5: Multi-Factor Authentication

```typescript
export interface MFACredentials {
	login: string;
	password: string;
	mfaCode: string;
}

public async authenticate(credentials: MFACredentials): Promise<Principal | null> {
	const attempt = { scheme: 'mfa', subject: credentials.login };
	if (!(await this.beforeAuthenticationAttempt(attempt)).allowed) {
		return null;
	}
	const reject = async (): Promise<null> => {
		await this.recordAuthenticationFailure(attempt);
		return null;
	};
	const principal = await this.findActivePrincipal({
		where: { login: credentials.login }
	});

	if (!principal) return reject();

	const passwordValid = await this.verifyPassword(
		credentials.password,
		principal
	);

	if (!passwordValid) return reject();

	// Verify MFA code
	const mfaValid = await this.verifyMFACode(principal.id, credentials.mfaCode);

	if (!mfaValid) return reject();
	await this.persistSuccess(principal);
	await this.recordAuthenticationSuccess(attempt);
	return principal;
}

protected abstract verifyPassword(
	password: string, principal: Principal
): Promise<boolean>;
protected abstract verifyMFACode(
	principalId: string, code: string
): Promise<boolean>;
protected abstract persistSuccess(principal: Principal): Promise<void>;
```

These are method fragments for an abstract driver. Implement the verifier and
persistence methods in your concrete driver; operational failures must propagate
without credential-failure recording.

## Base Migrations Structure

The framework provides `AuthMigrations` class that returns available migrations:

```typescript
export class AuthMigrations {
	public getMigrations(): Record<string, typeof Migration<any>> {
		return {
			'create-principals-table': CreatePrincipalsTableMigration,
		};
	}
}
```

When creating custom migrations:

1. **Extend Migration class** - Implement `up()` and `down()` methods
2. **Use standard columns** - Leverage DBAL's column-pack for consistency
3. **Include timestamps** - Always include `create_timestamp` for audit trail
4. **Deactivation not deletion** - Use `deactivate_timestamp` instead of hard deletes
5. **Register in migrations class** - Add to `getMigrations()` return object

## Common Implementation Checklist

- [ ] Define your `TPrincipal` type or use default `Principal`
- [ ] Extend `Authentication<TPrincipal>`
- [ ] Implement abstract `authenticate()` method
- [ ] Override `isActiveQuery()` if adding custom active logic beyond deactivation
- [ ] Override table/column names in constructor if needed
- [ ] Create database migration extending base schema
- [ ] Register migration in migrations class
- [ ] Test `createPrincipal()` functionality
- [ ] Test `authenticate()` logic
- [ ] Test `findActivePrincipal()` with your isActiveQuery
- [ ] Test `deactivatePrincipal()` functionality
- [ ] Test edge cases (null returns, invalid credentials, deactivated principals, etc.)
- [ ] Test `findActivePrincipal()` with your isActiveQuery
- [ ] Test edge cases (null returns, invalid credentials, etc.)

## Testing Your Driver

```typescript
import { Authentication } from '@riao/iam/authentication';
import { Principal } from '@riao/iam/auth';
import { Database } from '@riao/dbal';

describe('Custom Auth Driver', () => {
	let auth: Authentication<Principal>;
	let db: Database;

	beforeAll(async () => {
		// Setup test database
		db = new Database({ /* test config */ });
		auth = new CustomAuthDriver({ db });
	});

	it('can create and authenticate a principal', async () => {
		const id = await auth.createPrincipal({
			login: 'test.user',
			name: 'Test User',
			type: 'user',
		});

		const principal = await auth.authenticate({
			login: 'test.user',
			password: 'test-password'
		});

		expect(principal?.id).toBe(id);
	});

	it('returns null for invalid credentials', async () => {
		const principal = await auth.authenticate({
			login: 'nonexistent',
			password: 'any-password'
		});

		expect(principal).toBeNull();
	});
});
```

## Key Takeaways

1. **Extend, don't modify** - Always extend Authentication, never modify the base class
2. **Implement authenticate()** - This is your custom business logic entry point
3. **Use isActiveQuery()** - Define your principal status logic here
4. **Type safety** - Leverage TypeScript generics for compile-time safety
5. **Database flexibility** - Override table/column names to fit your schema
6. **Soft deletes** - Use `deactivate_timestamp` instead of deleting principals
7. **Migrations matter** - Properly structure your schema from the start
