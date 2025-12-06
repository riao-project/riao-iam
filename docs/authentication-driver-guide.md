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
	deactivate_timestamp: Date | null;  // null when active
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

**Example Implementation:**
```typescript
public async authenticate(credentials: { login: string; password: string }): Promise<Principal | null> {
	// Your authentication logic here
	const principal = await this.findActivePrincipal({
		where: { login: credentials.login }
	});
	
	if (!principal) return null;
	
	const isValid = await this.hash.verify(
        credentials.password,
        principal.password_hash
    );
	return isValid ? principal : null;
}
```

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
- **`hash`** (protected) - Hash instance for cryptographic operations
- **`principalTable`** (protected) - Database table name (default: `'iam_principals'`)
- **`principalIdColumn`** (protected) - ID column name (default: `'id'`)
- **`loginColumn`** (protected) - Login column name (default: `'login'`)

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
import { AuthOptions } from '@riao/iam/auth';
import { Principal } from '@riao/iam/auth';
import { Expression } from '@riao/dbal';

export class CustomAuthDriver extends Authentication<Principal> {
	// Optional: Override default table/column names
	protected principalTable = 'iam_principals';
	protected principalIdColumn = 'id';
	protected loginColumn = 'login';

	constructor(options: AuthOptions) {
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
		// Find the principal by login
		const principal = await this.findActivePrincipal({
			where: { login: credentials.login }
		});

		if (!principal) {
			return null;
		}

		// Verify the password (implement your own verification)
		const isValid = await this.verifyPassword(
			credentials.password,
			principal.passwordHash
		);

		return isValid ? principal : null;
	}

	/**
	 * Optional: Override to add custom active status logic beyond deactivation
	 * Default implementation filters for deactivate_timestamp: null
	 * Called automatically by findActivePrincipal()
	 */
	protected isActiveQuery(): Expression<Principal> {
		return { deactivate_timestamp: null };
	}

	// Helper method (not part of base class)
	private async verifyPassword(password: string, hash: string): Promise<boolean> {
		return this.hash.verify(password, hash);
	}
}
```

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
import { CustomAuthDriver } from './drivers/custom-auth-driver';

const db = new Database({
	// ... database config
});

const auth = new CustomAuthDriver({ db });

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
	issuer: string;
}

public async authenticate(credentials: JWTCredentials): Promise<Principal | null> {
	try {
		const decoded = await this.verifyJWT(credentials.token);
		return this.findActivePrincipal({
			where: { id: decoded.sub }
		});
	} catch {
		return null;
	}
}

private async verifyJWT(token: string): Promise<any> {
	// Your JWT verification logic
}
```

### Pattern 4: OAuth / External Provider

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
		const id = await this.createPrincipal({
			login: profile.email,
			name: profile.name,
			type: 'user',
		});
		principal = await this.principalRepo.findOne({ where: { id } });
	}

	return principal || null;
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
	// Verify password
	const principal = await this.findActivePrincipal({
		where: { login: credentials.login }
	});

	if (!principal) return null;

	const passwordValid = await this.hash.verify(
		credentials.password,
		principal.passwordHash
	);

	if (!passwordValid) return null;

	// Verify MFA code
	const mfaValid = await this.verifyMFACode(principal.id, credentials.mfaCode);

	return mfaValid ? principal : null;
}

private async verifyMFACode(principalId: string, code: string): Promise<boolean> {
	// Your MFA verification logic
}
```

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

