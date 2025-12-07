# Authorization Base Class Guide

## Overview

The **Authorization base class** is an abstract class that extends the `Auth` class and provides a framework for building custom authorization models. It handles permission evaluation, granting, and revoking with support for various authorization patterns like RBAC (Role-Based Access Control), ReBAC (Relationship-Based Access Control), and ABAC (Attribute-Based Access Control).

## Architecture

### Class Hierarchy

```
Auth<TPrincipal>
  └── Authorization<TPrincipal> (abstract)
        ├── RBAC Implementation
        ├── ReBAC Implementation
        ├── ABAC Implementation
        └── Your Custom Authorization Model
```

## Core Concepts

### Generic Type Parameter: `TPrincipal`

The Authorization class is generic over a `TPrincipal` type, allowing you to work with any principal structure while maintaining type safety.

### Authorization Context

The `AuthorizationContext` encapsulates all information needed to evaluate an authorization decision.

```typescript
interface AuthorizationContext<TPrincipal extends Principal = Principal> {
	principal: TPrincipal;           // The subject requesting access
	action: string;                   // The action being requested (e.g., 'read', 'write', 'delete')
	resource?: string | Record<string, unknown>;  // The resource being accessed
	metadata?: Record<string, unknown>;           // Additional context (IP, time, etc.)
}
```

### Authorization Result

The `AuthorizationResult` represents the outcome of an authorization evaluation.

```typescript
interface AuthorizationResult {
	allowed: boolean;      // Whether the action is authorized
	reason?: string;       // Optional reason for the decision
}
```

## Base Class Methods

### Abstract Methods

These methods **must** be implemented by subclasses:

#### 1. `evaluate(context: AuthorizationContext<TPrincipal>): Promise<AuthorizationResult>`

Evaluates whether a principal is authorized to perform an action on a resource.

**Parameters:**
- `context` - The authorization context containing principal, action, resource, and metadata

**Returns:** Authorization result with allowed status and optional reason

**Example:**
```typescript
public async evaluate(
	context: AuthorizationContext<Principal>
): Promise<AuthorizationResult> {
	// Your authorization logic here
	if (await this.hasPermission(context)) {
		return { allowed: true };
	}
	return {
		allowed: false,
		reason: 'Principal lacks required permissions',
	};
}
```

#### 2. `grantPermission(options: GrantPermissionOptions): Promise<void>`

Grants a permission to a principal.

**Options:**
- `principalId` - The ID of the principal
- `action` - The action to grant (e.g., 'read', 'write', 'delete')
- `resource` - Optional resource identifier
- `metadata` - Optional context data (when permission was granted, by whom, etc.)

**Example:**
```typescript
public async grantPermission(
	options: GrantPermissionOptions
): Promise<void> {
	const { principalId, action, resource, metadata } = options;
	// Store the permission grant in your data store
	await this.permissionRepo.insertOne({
		record: {
			principal_id: principalId,
			action,
			resource,
			granted_at: new Date(),
			...metadata,
		},
	});
}
```

#### 3. `revokePermission(options: RevokePermissionOptions): Promise<void>`

Revokes a permission from a principal.

**Options:**
- `principalId` - The ID of the principal
- `action` - The action to revoke
- `resource` - Optional resource identifier
- `metadata` - Optional context data

**Example:**
```typescript
public async revokePermission(
	options: RevokePermissionOptions
): Promise<void> {
	const { principalId, action, resource } = options;
	// Remove the permission from your data store
	await this.permissionRepo.delete({
		where: {
			principal_id: principalId,
			action,
			resource,
		},
	});
}
```

### Public Methods

#### 1. `isAuthorized(context: AuthorizationContext<TPrincipal>): Promise<boolean>`

Convenience method that checks if a principal is authorized for an action.

**Parameters:**
- `context` - The authorization context containing principal, action, resource, and optional metadata

**Returns:** `true` if authorized, `false` otherwise

**Example:**
```typescript
const isAllowed = await auth.isAuthorized({
	principal: user,
	action: 'edit',
	resource: 'document_123',
	metadata: { ipAddress: '192.168.1.1' }
});

if (isAllowed) {
	// Proceed with the operation
}
```

### Protected Methods

#### 2. `checkPermission(context: AuthorizationContext<TPrincipal>): Promise<AuthorizationResult>`

Default permission checking logic. Override this in subclasses for custom authorization models.

**Default Behavior:** Returns `{ allowed: false, reason: 'No authorization model configured' }`

**Example Override:**
```typescript
protected async checkPermission(
	context: AuthorizationContext<Principal>
): Promise<AuthorizationResult> {
	// Check if principal has the required role for this action
	const roles = await this.getRoles(context.principal.id);
	const hasRole = roles.some(role => 
		this.rolePermissions[role]?.includes(context.action)
	);

	if (hasRole) {
		return { allowed: true };
	}

	return {
		allowed: false,
		reason: `Principal lacks required role for action: ${context.action}`,
	};
}
```

## Implementation Examples

### Example 1: Role-Based Access Control (RBAC)

```typescript
import { Authorization, AuthorizationContext, AuthorizationResult } from './authorization';
import { Principal } from './auth';
import { DatabaseRecordId } from '@riao/dbal';

export class RBACAuthorization extends Authorization<Principal> {
	private rolePermissions: Map<string, Set<string>> = new Map();

	protected async checkPermission(
		context: AuthorizationContext<Principal>
	): Promise<AuthorizationResult> {
		// Get principal's roles
		const roles = await this.getPrincipalRoles(context.principal.id);

		// Check if any role has the required action
		for (const role of roles) {
			const permissions = this.rolePermissions.get(role) || new Set();
			if (permissions.has(context.action)) {
				return { allowed: true };
			}
		}

		return {
			allowed: false,
			reason: `Principal has no role with action: ${context.action}`,
		};
	}

	public async evaluate(
		context: AuthorizationContext<Principal>
	): Promise<AuthorizationResult> {
		return this.checkPermission(
			context.principal,
			context.action,
			context.resource,
			context.metadata
		);
	}

	public async grantPermission(
		options: GrantPermissionOptions
	): Promise<void> {
		// Implementation for RBAC
		const { principalId, action, resource, metadata } = options;
		const role = metadata?.role as string;
		const permissions = this.rolePermissions.get(role) || new Set();
		permissions.add(action);
		this.rolePermissions.set(role, permissions);
	}

	public async revokePermission(
		options: RevokePermissionOptions
	): Promise<void> {
		// Implementation for RBAC
		const { action, metadata } = options;
		const role = metadata?.role as string;
		const permissions = this.rolePermissions.get(role);
		if (permissions) {
			permissions.delete(action);
		}
	}

	private async getPrincipalRoles(principalId: string): Promise<string[]> {
		// Fetch roles from database
		return [];
	}
}
```

### Example 2: Attribute-Based Access Control (ABAC)

```typescript
export class ABACAuthorization extends Authorization<Principal> {
	protected async checkPermission(
		context: AuthorizationContext<Principal>
	): Promise<AuthorizationResult> {
		// Get principal attributes
		const principalAttrs = await this.getPrincipalAttributes(context.principal.id);

		// Get resource attributes
		const resourceAttrs = typeof context.resource === 'string' 
			? await this.getResourceAttributes(context.resource)
			: context.resource;

		// Evaluate policy with attributes
		const allowed = await this.evaluatePolicy({
			principal: principalAttrs,
			action: context.action,
			resource: resourceAttrs,
			environment: context.metadata,
		});

		if (allowed) {
			return { allowed: true };
		}

		return {
			allowed: false,
			reason: 'Policy evaluation denied access',
		};
	}

	public async evaluate(
		context: AuthorizationContext<Principal>
	): Promise<AuthorizationResult> {
		return this.checkPermission(context);
	}

	public async grantPermission(
		options: GrantPermissionOptions
	): Promise<void> {
		// Store policy rules
	}

	public async revokePermission(
		options: RevokePermissionOptions
	): Promise<void> {
		// Remove policy rules
	}

	private async getPrincipalAttributes(principalId: string): Promise<Record<string, unknown>> {
		return {};
	}

	private async getResourceAttributes(resourceId: string): Promise<Record<string, unknown>> {
		return {};
	}

	private async evaluatePolicy(context: any): Promise<boolean> {
		return true;
	}
}
```

## Usage Patterns

### Basic Authorization Check

```typescript
const auth = new YourAuthorizationImpl({ db });

// Check simple authorization
const canRead = await auth.isAuthorized(user, 'read', 'document_123');

if (!canRead) {
	throw new Error('Unauthorized');
}
```

### Detailed Evaluation with Context

```typescript
const result = await auth.evaluate({
	principal: user,
	action: 'edit',
	resource: document,
	metadata: {
		ipAddress: request.ip,
		userAgent: request.userAgent,
		timestamp: new Date(),
	},
});

if (!result.allowed) {
	console.error(`Access denied: ${result.reason}`);
	throw new Error('Unauthorized');
}
```

### Granting and Revoking Permissions

```typescript
// Grant a permission
await auth.grantPermission(userId, 'admin_access', undefined, {
	grantedBy: 'super_admin',
	grantedAt: new Date(),
});

// Revoke a permission
await auth.revokePermission(userId, 'admin_access', undefined, {
	revokedBy: 'super_admin',
	revokedAt: new Date(),
});
```

## Best Practices

### 1. Separate Concerns

Keep authentication and authorization separate. Use the `Authentication` class for verifying credentials and the `Authorization` class for permission checks.

### 2. Cache Policy Results

For performance-sensitive applications, cache authorization decisions with appropriate TTL:

```typescript
private cache = new Map<string, { result: AuthorizationResult; expiry: number }>();

public async evaluate(context: AuthorizationContext<Principal>): Promise<AuthorizationResult> {
	const cacheKey = `${context.principal.id}:${context.action}:${context.resource}`;
	const cached = this.cache.get(cacheKey);

	if (cached && cached.expiry > Date.now()) {
		return cached.result;
	}

	const result = await this.checkPermission(
		context.principal,
		context.action,
		context.resource,
		context.metadata
	);

	this.cache.set(cacheKey, {
		result,
		expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
	});

	return result;
}
```

### 3. Provide Detailed Reasons

Always provide meaningful reasons for denials to help with debugging and logging:

```typescript
return {
	allowed: false,
	reason: `Principal (${principal.id}) lacks role 'admin' for action 'delete'`,
};
```

### 4. Audit Trail

Log authorization decisions for security and compliance:

```typescript
public async evaluate(context: AuthorizationContext<Principal>): Promise<AuthorizationResult> {
	const result = await this.checkPermission(
		context.principal,
		context.action,
		context.resource,
		context.metadata
	);

	this.logger.info({
		event: 'authorization_check',
		principal: context.principal.id,
		action: context.action,
		resource: context.resource,
		allowed: result.allowed,
		reason: result.reason,
	});

	return result;
}
```

### 5. Error Handling

Handle authorization errors appropriately without exposing sensitive information:

```typescript
try {
	const result = await auth.evaluate(context);
	if (!result.allowed) {
		throw new UnauthorizedError('Access denied');
	}
} catch (error) {
	// Log internal details
	logger.error('Authorization check failed', error);
	// Return safe error to client
	throw new UnauthorizedError('Access denied');
}
```

## Testing

When testing your Authorization implementation, create concrete implementations for testing:

```typescript
class TestAuthorization extends Authorization<Principal> {
	public async evaluate(
		context: AuthorizationContext<Principal>
	): Promise<AuthorizationResult> {
		return this.checkPermission(
			context.principal,
			context.action,
			context.resource,
			context.metadata
		);
	}

	public async grantPermission(): Promise<void> {
		// Mock implementation
	}

	public async revokePermission(): Promise<void> {
		// Mock implementation
	}
}

describe('Authorization', () => {
	it('should deny access by default', async () => {
		const auth = new TestAuthorization({ db });
		const result = await auth.evaluate({
			principal: user,
			action: 'admin_access',
		});

		expect(result.allowed).toBe(false);
	});
});
```

## Summary

The Authorization base class provides a flexible foundation for implementing various authorization models. By extending it and implementing the three abstract methods, you can build authorization systems that fit your application's specific needs, whether it's RBAC, ReBAC, ABAC, or a custom combination.
