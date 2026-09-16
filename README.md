# @riao/iam - Readme

## Installation

`npm i @riao/iam`

## Usage

### Quick Start

@riao/iam is an Identity and Access Management (IAM) library that provides a flexible framework for:
- **Authentication**: Validating user credentials and managing principals
- **Authorization**: Controlling access to resources based on permissions

### Core Concepts

#### Principal
A principal represents any entity (user, service, bot, or system) that can authenticate and be authorized.

#### Auth Class
Base class that manages principals and provides access to the principals repository.

#### Authentication
Abstract class extending `Auth` that handles credential validation. Implement this to create custom authentication drivers (password-based, OAuth, JWT, etc.).

#### Authorization
Abstract class extending `Auth` that manages permissions and access control. Implement this to define your authorization model.

### Setup & Configuration

#### 1. Initialize with a Database

```typescript
import { Database } from '@riao/dbal';
import { Authentication, Authorization } from '@riao/iam';

const db = new Database({
  // Your database configuration
});
```

#### 2. Create a Custom Authentication Driver

Extend the `Authentication` class to implement your authentication logic:

```typescript
import { Authentication, Principal } from '@riao/iam';

class PasswordAuthentication extends Authentication<Principal> {
  async authenticate(credentials: { 
    login: string; 
    password: string 
  }): Promise<Principal | null> {
    // Find the principal by login
    const principal = await this.findActivePrincipal({
      where: { login: credentials.login }
    });
    
    if (!principal) {
		return null;
	}
    
    // Verify password (you'd use your hash verification logic)
    const isValid = await verifyPassword(
      credentials.password, 
      principal.passwordHash
    );
    
    return isValid ? principal : null;
  }

  // Implement the isActiveQuery if needed for custom active status logic
  protected isActiveQuery() {
    return { where: { deactivate_timestamp: null } };
  }
}

// Initialize your authentication driver
const auth = new PasswordAuthentication({ db });
```

#### 3. Create a Custom Authorization Driver

Extend the `Authorization` class to implement your permission model:

```typescript
import { Authorization, AuthorizationContext, AuthorizationResult } from '@riao/iam';

class RoleBasedAuthorization extends Authorization<Principal> {
  async evaluate(context: AuthorizationContext<Principal>): Promise<AuthorizationResult> {
    const { principal, action, resource } = context;
    
    // Implement your authorization logic
    const hasPermission = await this.checkPermission(context);
    return hasPermission;
  }

  async grantPermission(options: GrantPermissionOptions): Promise<void> {
    // Implement grant logic
  }

  async revokePermission(options: RevokePermissionOptions): Promise<void> {
    // Implement revoke logic
  }
}

const authz = new RoleBasedAuthorization({ db });
```

### Common Tasks

#### Authenticate a User

```typescript
const credentials = { login: 'john.doe', password: 'secret123' };
const principal = await auth.authenticate(credentials);

if (principal) {
  console.log(`Authenticated as: ${principal.name}`);
} else {
  console.log('Authentication failed');
}
```

#### Create a New Principal

```typescript
const principalId = await auth.createPrincipal({
  login: 'jane.doe',
  name: 'Jane Doe',
  type: 'user',
  deactivate_timestamp: null
});

console.log(`Created principal with ID: ${principalId}`);
```

#### Check Authorization

```typescript
const context = {
  principal: authenticatedPrincipal,
  resource: 'document-123',
  action: 'read'
};

const isAuthorized = await authz.isAuthorized(context);
if (isAuthorized) {
  console.log('Access granted');
} else {
  console.log('Access denied');
}
```

#### Grant Permissions

```typescript
await authz.grantPermission({
  principalId: principal.id,
  action: 'delete',
  resource: 'document-123',
  metadata: { grantedBy: 'admin', grantedAt: new Date() }
});
```

#### Revoke Permissions

```typescript
await authz.revokePermission({
  principalId: principal.id,
  action: 'delete',
  resource: 'document-123'
});
```

### Advanced

For detailed information on:
- Building custom authentication drivers, see [authentication-driver-guide.md](docs/authentication-driver-guide.md)
- Building custom authorization drivers, see [authorization-driver-guide.md](docs/authorization-driver-guide.md)
- Database migrations and schema setup, see [Database Setup](#database-setup)

### Database Setup

@riao/iam requires database tables to store principals and permissions. Use the `AuthMigrations` class to set up the required schema:

```typescript
import { AuthMigrations } from '@riao/iam';

const migrations = new AuthMigrations();
await db.runMigrations(migrations);
```

## Contributing & Development

See [contributing.md](docs/contributing/contributing.md) for information on how to develop or contribute to this project!
