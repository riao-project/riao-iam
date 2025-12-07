# Hash Guide

The `Hash` class provides a simple and secure way to hash and verify passwords using bcrypt. It's designed to be easy to use while following security best practices by default.

## Table of Contents

- [Overview](#overview)
- [The `make` Method](#the-make-method)
- [The `check` Method](#the-check-method)
- [Usage Examples](#usage-examples)
- [Security Considerations](#security-considerations)
- [Configuration](#configuration)
- [Error Handling](#error-handling)

## Overview

The `Hash` class wraps the bcrypt library to provide:

- **`make`**: Hashes a string input using bcrypt with a configurable number of rounds
- **`check`**: Verifies that an input matches a previously hashed string

Bcrypt is a widely-used password hashing algorithm that includes salt generation and adaptive work factors to protect against rainbow table attacks and brute-force attempts.

### Why use bcrypt?

- **Adaptive**: The cost factor increases over time as computers get faster
- **Salted**: Each hash includes a unique salt to prevent rainbow table attacks
- **Irreversible**: Passwords cannot be recovered from hashes
- **Industry Standard**: Used by many production applications

## The `make` Method

The `make` method hashes a plain text string using bcrypt. It returns a Promise that resolves to the hashed string.

### Parameters

- **`input`** (string): The plain text to hash (typically a password)
- **`rounds?`** (number, optional): Number of bcrypt rounds. If not provided, uses the instance's `rounds` property (default: 12)

### How it works

1. Takes the plain text input
2. Generates a random salt
3. Applies bcrypt hashing using the specified number of rounds
4. Returns the hashed result with embedded salt

### Example

```typescript
import { Hash } from '@riao/iam';

const hasher = new Hash();

// Hash a password with default rounds (12)
const hashed = await hasher.make('my-secure-password');
console.log(hashed); // $2b$12$...

// Hash with custom rounds
const hashed2 = await hasher.make('my-secure-password', 10);
console.log(hashed2); // $2b$10$...
```

## The `check` Method

The `check` method verifies that a plain text input matches a previously hashed value. It returns a Promise that resolves to a boolean.

### Parameters

- **`input`** (string): The plain text to verify (typically a password)
- **`hashed`** (string): The previously hashed string to compare against

### How it works

1. Takes the plain text input
2. Extracts the salt from the hashed string
3. Hashes the input with the same salt
4. Compares the results
5. Returns true if they match, false otherwise

### Example

```typescript
import { Hash } from '@riao/iam';

const hasher = new Hash();

const password = 'my-secure-password';
const hashed = await hasher.make(password);

// Verify the password
const isValid = await hasher.check(password, hashed);
console.log(isValid); // true

// Wrong password
const isInvalid = await hasher.check('wrong-password', hashed);
console.log(isInvalid); // false
```

## Usage Examples

### User Registration

```typescript
import { Hash } from '@riao/iam';

class UserService {
	private hasher = new Hash();

	async registerUser(email: string, password: string) {
		// Hash the password before storing
		const hashedPassword = await this.hasher.make(password);

		// Store in database
		const user = {
			email,
			password: hashedPassword
		};

		// Save user...
		return user;
	}
}
```

### User Login

```typescript
import { Hash } from '@riao/iam';

class AuthService {
	private hasher = new Hash();

	async login(email: string, password: string) {
		// Retrieve user from database
		const user = await getUserByEmail(email);

		if (!user) {
			throw new Error('User not found');
		}

		// Verify password
		const isValid = await this.hasher.check(password, user.password);

		if (!isValid) {
			throw new Error('Invalid password');
		}

		return { success: true, user };
	}
}
```

### Configuring Hash Rounds

```typescript
import { Hash } from '@riao/iam';

// Create hasher with custom rounds
const hasher = new Hash();
hasher.rounds = 14; // Increase security at the cost of slower hashing

// All future calls use the new rounds value
const hashed = await hasher.make('password');

// Or override for a single call
const hashedCustom = await hasher.make('password', 16);
```

### Password Change Workflow

```typescript
import { Hash } from '@riao/iam';

class UserService {
	private hasher = new Hash();

	async changePassword(userId: string, currentPassword: string, newPassword: string) {
		// Get user from database
		const user = await getUserById(userId);

		// Verify current password
		const isCurrentValid = await this.hasher.check(currentPassword, user.password);

		if (!isCurrentValid) {
			throw new Error('Current password is incorrect');
		}

		// Hash new password
		const hashedNewPassword = await this.hasher.make(newPassword);

		// Update user
		user.password = hashedNewPassword;
		await user.save();

		return { success: true };
	}
}
```

### Batch Processing Multiple Passwords

```typescript
import { Hash } from '@riao/iam';

const hasher = new Hash();

const passwords = ['password1', 'password2', 'password3'];

// Hash multiple passwords in parallel
const hashedPasswords = await Promise.all(
	passwords.map(pwd => hasher.make(pwd))
);

console.log(hashedPasswords);
```

## Security Considerations

### Round Factor Selection

The number of rounds determines how computationally expensive the hashing process is:

| Rounds | Relative Time | Use Case |
|--------|---------------|----------|
| 10 | ~10ms | Testing/Development (not recommended for production) |
| 12 | ~100ms | **Recommended for most applications** |
| 14 | ~1s | Higher security requirements |
| 16+ | ~10s+ | Very high security, but may impact user experience |

**Recommendation**: Use 12-14 rounds for production applications. As computers get faster, you may want to increase this over time.

### Never Store Plain Text Passwords

```typescript
// ❌ WRONG - Never do this!
user.password = plainPassword;

// ✅ CORRECT - Always hash before storing
user.password = await hasher.make(plainPassword);
```

### Always Use Async Methods

Bcrypt operations are CPU-intensive. Always use the async methods to avoid blocking your event loop:

```typescript
// ❌ WRONG - Would block the event loop
const hashed = hashSync(password);

// ✅ CORRECT - Uses async/await
const hashed = await hasher.make(password);
```

### Timing Attack Resistance

The `check` method uses bcrypt's internal comparison which is timing-attack resistant. Do not implement your own comparison:

```typescript
// ❌ WRONG - Vulnerable to timing attacks
if (computedHash === storedHash) { /* ... */ }

// ✅ CORRECT - Uses bcrypt's safe comparison
const isValid = await hasher.check(password, storedHash);
```

## Configuration

### Default Rounds

You can configure the default number of rounds when creating a Hash instance:

```typescript
import { Hash } from '@riao/iam';

const hasher = new Hash();

// Change default rounds
hasher.rounds = 14;

// All subsequent calls will use 14 rounds
const hash1 = await hasher.make('password1');
const hash2 = await hasher.make('password2');
```

### Per-Call Override

You can also override the rounds for individual calls:

```typescript
import { Hash } from '@riao/iam';

const hasher = new Hash(); // rounds defaults to 12

// Use custom rounds for this call only
const hash = await hasher.make('password', 16);

// Subsequent calls use the default again
const hash2 = await hasher.make('password2'); // Uses 12 rounds
```

## Error Handling

The Hash class methods return Promises that may reject with errors. Handle them appropriately:

```typescript
import { Hash } from '@riao/iam';

const hasher = new Hash();

try {
	const hashed = await hasher.make('password');
	console.log('Hash created:', hashed);
}
catch (error) {
	console.error('Hashing failed:', error.message);
	// Handle error appropriately
}

try {
	const isValid = await hasher.check('password', hashedValue);
	console.log('Password valid:', isValid);
}
catch (error) {
	console.error('Check failed:', error.message);
	// Handle error appropriately
}
```

### Common Error Scenarios

1. **Invalid Hash Format**: If the hashed value is not a valid bcrypt hash
2. **Computational Limits**: If the rounds value is too high (> 31)
3. **Null/Undefined Values**: If input or hashed parameters are missing

Always validate inputs before passing them to Hash methods:

```typescript
import { Hash } from '@riao/iam';

const hasher = new Hash();

async function safeHash(password: string | null | undefined): Promise<string | null> {
	if (!password || typeof password !== 'string') {
		console.error('Invalid password');
		return null;
	}

	try {
		return await hasher.make(password);
	}
catch (error) {
		console.error('Failed to hash password:', error);
		return null;
	}
}
```
