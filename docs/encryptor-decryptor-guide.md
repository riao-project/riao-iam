# Encryptor and Decryptor Classes Guide

The `Encryptor` and `Decryptor` classes provide object-oriented wrappers around RSA encryption and decryption operations. These classes offer a convenient way to manage encryption/decryption state across multiple operations without repeatedly passing keys.

## Table of Contents

- [Overview](#overview)
- [The `Encryptor` Class](#the-encryptor-class)
- [The `Decryptor` Class](#the-decryptor-class)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)
- [Integration with KeyPairGenerator](#integration-with-keypairgenerator)

## Overview

These classes encapsulate RSA public-key cryptography in an object-oriented interface:

- **`Encryptor`**: Wraps a public key to provide a reusable encryption interface
- **`Decryptor`**: Wraps a private key to provide a reusable decryption interface

The class-based approach is ideal for:
- Application components that need to perform encryption/decryption repeatedly
- Dependency injection scenarios where encryption/decryption is a service
- Cleaner code when working with multiple operations
- Separating encryption logic into specialized components

## The `Encryptor` Class

The `Encryptor` class encapsulates RSA public-key encryption. It accepts a public key during construction and provides an `encrypt` method for encrypting data.

### Constructor

```typescript
new Encryptor(publicKey: crypto.KeyObject)
```

**Parameters:**
- `publicKey`: A Node.js `crypto.KeyObject` representing the RSA public key

**Returns:** An `Encryptor` instance

### The `encrypt` Method

```typescript
encrypt(data: string | Buffer): Buffer
```

**Parameters:**
- `data`: The data to encrypt, as either a string or Buffer

**Returns:** A Buffer containing the encrypted data

**Behavior:**
- Accepts both string and Buffer input
- Automatically converts strings to Buffers
- Uses RSA public-key encryption via Node.js crypto module
- Returns encrypted data as a Buffer

### Example: Basic Encryption

```typescript
import { Encryptor, KeyPairGenerator } from '@riao/iam';

// Generate a keypair
const generator = new KeyPairGenerator({ algorithm: 'RS256' });
const keypair = generator.generate();

// Create an Encryptor with the public key
const encryptor = new Encryptor(keypair.publicKey);

// Encrypt data
const encrypted = encryptor.encrypt('Sensitive data');
console.log(encrypted); // Buffer: <Buffer 45 f3 22 ...>
```

### Example: Multiple Encryptions

```typescript
const encryptor = new Encryptor(keypair.publicKey);

const messages = [
  'Message 1',
  'Message 2',
  'Message 3'
];

const encrypted = messages.map(msg => encryptor.encrypt(msg));
// encrypted is an array of Buffers
```

### Example: Encrypting Buffer Data

```typescript
const encryptor = new Encryptor(keypair.publicKey);

const jsonData = Buffer.from(
  JSON.stringify({ user: 'alice', role: 'admin' }),
  'utf-8'
);

const encrypted = encryptor.encrypt(jsonData);
```

## The `Decryptor` Class

The `Decryptor` class encapsulates RSA private-key decryption. It accepts a private key during construction and provides a `decrypt` method for decrypting data encrypted with the corresponding public key.

### Constructor

```typescript
new Decryptor(privateKey: crypto.KeyObject)
```

**Parameters:**
- `privateKey`: A Node.js `crypto.KeyObject` representing the RSA private key

**Returns:** A `Decryptor` instance

### The `decrypt` Method

```typescript
decrypt(encryptedData: Buffer): Buffer
```

**Parameters:**
- `encryptedData`: A Buffer containing data encrypted with the corresponding public key

**Returns:** A Buffer containing the decrypted data

**Behavior:**
- Accepts only Buffer input (encrypted data should be a Buffer)
- Uses RSA private-key decryption via Node.js crypto module
- Returns decrypted data as a Buffer
- Can be converted to string using `.toString()` or `.toString('utf-8')`

### Example: Basic Decryption

```typescript
import { Encryptor, Decryptor, KeyPairGenerator } from '@riao/iam';

// Generate a keypair
const generator = new KeyPairGenerator({ algorithm: 'RS256' });
const keypair = generator.generate();

// Create Encryptor and Decryptor
const encryptor = new Encryptor(keypair.publicKey);
const decryptor = new Decryptor(keypair.privateKey);

// Encrypt and then decrypt
const encrypted = encryptor.encrypt('Secret message');
const decrypted = decryptor.decrypt(encrypted);

console.log(decrypted.toString()); // 'Secret message'
```

### Example: Batch Decryption

```typescript
const encryptedMessages = [/* array of Buffers */];
const decryptor = new Decryptor(keypair.privateKey);

const decrypted = encryptedMessages.map(msg => 
  decryptor.decrypt(msg).toString()
);
```

### Example: Decrypting JSON Data

```typescript
const encryptor = new Encryptor(keypair.publicKey);
const decryptor = new Decryptor(keypair.privateKey);

const userData = { user: 'alice', role: 'admin', id: 12345 };
const encrypted = encryptor.encrypt(JSON.stringify(userData));

const decrypted = decryptor.decrypt(encrypted);
const parsed = JSON.parse(decrypted.toString());

console.log(parsed); // { user: 'alice', role: 'admin', id: 12345 }
```

## Usage Examples

### Example 1: Simple Encrypt/Decrypt Workflow

```typescript
import { Encryptor, Decryptor, KeyPairGenerator } from '@riao/iam';

const generator = new KeyPairGenerator({ algorithm: 'RS256' });
const keypair = generator.generate();

const encryptor = new Encryptor(keypair.publicKey);
const decryptor = new Decryptor(keypair.privateKey);

const message = 'Confidential Information';
const encrypted = encryptor.encrypt(message);
const decrypted = decryptor.decrypt(encrypted);

console.log(decrypted.toString() === message); // true
```

### Example 2: Sharing Public Keys with Multiple Encryptors

```typescript
import { Encryptor, KeyPairGenerator } from '@riao/iam';

// Server generates a keypair
const generator = new KeyPairGenerator({ algorithm: 'RS256' });
const keypair = generator.generate();

// Export public key to distribute to clients
const publicKeyPEM = keypair.publicKey.export({ format: 'pem', type: 'spki' });

// Client imports public key and creates Encryptor
const { createPublicKey } = require('crypto');
const publicKey = createPublicKey({
  key: publicKeyPEM,
  format: 'pem'
});

const clientEncryptor = new Encryptor(publicKey);
const encrypted = clientEncryptor.encrypt('Client message');

// Server can decrypt with private key
const serverDecryptor = new Decryptor(keypair.privateKey);
const decrypted = serverDecryptor.decrypt(encrypted);
console.log(decrypted.toString()); // 'Client message'
```

### Example 3: Encrypting Different RSA Algorithms

```typescript
import { Encryptor, Decryptor, KeyPairGenerator } from '@riao/iam';

const algorithms = ['RS256', 'RS384', 'RS512'];

for (const algorithm of algorithms) {
  const generator = new KeyPairGenerator({ algorithm: algorithm as any });
  const keypair = generator.generate();
  
  const encryptor = new Encryptor(keypair.publicKey);
  const decryptor = new Decryptor(keypair.privateKey);
  
  const data = `Test with ${algorithm}`;
  const encrypted = encryptor.encrypt(data);
  const decrypted = decryptor.decrypt(encrypted);
  
  console.log(`${algorithm}: ${decrypted.toString() === data}`); // true
}
```

### Example 4: Using as Service Dependencies

```typescript
// In a dependency injection container or module
class EncryptionService {
  private encryptor: Encryptor;
  private decryptor: Decryptor;

  constructor(keypair: any) {
    this.encryptor = new Encryptor(keypair.publicKey);
    this.decryptor = new Decryptor(keypair.privateKey);
  }

  encrypt(data: string | Buffer): Buffer {
    return this.encryptor.encrypt(data);
  }

  decrypt(encryptedData: Buffer): string {
    return this.decryptor.decrypt(encryptedData).toString();
  }
}

// Usage
const generator = new KeyPairGenerator({ algorithm: 'RS256' });
const service = new EncryptionService(generator.generate());

const encrypted = service.encrypt('Secret');
const decrypted = service.decrypt(encrypted);
console.log(decrypted); // 'Secret'
```

## Best Practices

### 1. Keep Decryptors Secure

```typescript
// DON'T: Pass decryptor around loosely
export const decryptor = new Decryptor(privateKey);

// DO: Keep it scoped to trusted components
class SecureService {
  private decryptor: Decryptor;
  
  constructor(privateKey: crypto.KeyObject) {
    this.decryptor = new Decryptor(privateKey);
  }
}
```

### 2. Handle Buffer Conversions Carefully

```typescript
const encryptor = new Encryptor(publicKey);
const decryptor = new Decryptor(privateKey);

// String input is automatically converted
const encrypted1 = encryptor.encrypt('Hello');

// Buffer input is also supported
const encrypted2 = encryptor.encrypt(Buffer.from('Hello', 'utf-8'));

// Always explicitly convert output to string if needed
const decrypted = decryptor.decrypt(encrypted1);
const message = decrypted.toString('utf-8');
```

### 3. Use Appropriate RSA Key Sizes

```typescript
// Larger key sizes provide better security but slower encryption
const generator = new KeyPairGenerator({ algorithm: 'RS512' }); // Recommended
const keypair = generator.generate();

const encryptor = new Encryptor(keypair.publicKey);
const decryptor = new Decryptor(keypair.privateKey);
```

### 4. Store Private Keys Securely

```typescript
// DON'T: Hardcode private keys
const keypair = JSON.parse(hardcodedJSON); // Never do this

// DO: Load from secure configuration
const privateKeyPEM = process.env.PRIVATE_KEY;
const { createPrivateKey } = require('crypto');
const privateKey = createPrivateKey({
  key: privateKeyPEM,
  format: 'pem',
  passphrase: process.env.KEY_PASSPHRASE
});

const decryptor = new Decryptor(privateKey);
```

### 5. Manage Error Cases

```typescript
const decryptor = new Decryptor(privateKey);

try {
  const decrypted = decryptor.decrypt(encryptedData);
  // Process decrypted data
} catch (error) {
  // Handle decryption errors
  console.error('Decryption failed:', error.message);
}
```

## Security Considerations

For comprehensive information on cryptographic security, key management, data size limitations, and algorithm selection, see the [Encryption and Decryption Guide](crypto-guide.md#security-considerations).

Additionally, when using the `Encryptor` and `Decryptor` classes:

- **Keep Decryptors Secure**: Scope decryptors to trusted components and never export them loosely
- **Private Key Protection**: Follow the key management best practices outlined in the crypto guide
- **Error Handling**: Always wrap decryption operations in try-catch blocks to handle decryption failures gracefully

## Integration with KeyPairGenerator

The `Encryptor` and `Decryptor` classes integrate seamlessly with `KeyPairGenerator`. For detailed examples on generating, saving, and loading key pairs, see the [KeyPair Usage Guide](keypair-guide.md).

Quick example:

```typescript
import { Encryptor, Decryptor, KeyPairGenerator } from '@riao/iam';

// Generate keypair
const generator = new KeyPairGenerator({ algorithm: 'RS256' });
const keypair = generator.generate();

// Create instances
const encryptor = new Encryptor(keypair.publicKey);
const decryptor = new Decryptor(keypair.privateKey);

// Use for encryption/decryption
const data = 'Sensitive data';
const encrypted = encryptor.encrypt(data);
const decrypted = decryptor.decrypt(encrypted);
```

## See Also

- [Encryption and Decryption Guide](crypto-guide.md) - Function-based encryption/decryption
- [KeyPairGenerator Guide](keypair-guide.md) - Creating RSA keypairs
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
