# KeyPair Usage Guide

The `KeyPairGenerator` class provides utilities for generating, saving, and loading cryptographic key pairs using various algorithms. It supports both RSA and Elliptic Curve (EC) algorithms suitable for signing and encryption operations.

## Table of Contents

- [Supported Algorithms](#supported-algorithms)
- [Generating Key Pairs](#generating-key-pairs)
- [Saving Key Pairs](#saving-key-pairs)
- [Loading Key Pairs](#loading-key-pairs)
- [Encryption and Decryption](#encryption-and-decryption)
- [Examples](#examples)

## Supported Algorithms

The `KeyPairGenerator` supports the following algorithms:

### RSA Algorithms
- **RS512**: RSA with SHA-256 (2048-bit keys)
- **RS384**: RSA with SHA-384 (3072-bit keys)
- **RS512**: RSA with SHA-512 (4096-bit keys)

### Elliptic Curve Algorithms
- **ES256**: ECDSA with SHA-256 (P-256 curve)
- **ES384**: ECDSA with SHA-384 (P-384 curve)
- **ES512**: ECDSA with SHA-512 (P-521 curve)

## Generating Key Pairs

### RSA Key Pair (RS512)

```typescript
import { KeyPairGenerator } from 'riao-iam';

const generator = new KeyPairGenerator({ algorithm: 'RS512' });
const keyPair = generator.generate();

console.log(keyPair.publicKey);   // Node.js KeyObject (public key)
console.log(keyPair.privateKey);  // Node.js KeyObject (private key)
console.log(keyPair.algorithm);   // 'RS512'
```

### Elliptic Curve Key Pair (ES256)

```typescript
const generator = new KeyPairGenerator({ algorithm: 'ES256' });
const keyPair = generator.generate();

// Use keyPair for ECDSA operations
```

## Saving Key Pairs

Save generated key pairs to files in PEM format:

```typescript
import { KeyPairGenerator } from 'riao-iam';

const generator = new KeyPairGenerator({ algorithm: 'RS512' });
const keyPair = generator.generate();

generator.save({
  keys: keyPair,
  publicKeyPath: './keys/public.pem',
  privateKeyPath: './keys/private.pem'
});
```

The keys are exported in standard PEM format suitable for use with Node.js and other cryptographic libraries.

## Loading Key Pairs

Load previously saved key pairs from files:

```typescript
import { KeyPairGenerator } from 'riao-iam';

const generator = new KeyPairGenerator({ algorithm: 'RS512' });

const keyPair = generator.load({
  publicKeyPath: './keys/public.pem',
  privateKeyPath: './keys/private.pem'
});

console.log(keyPair.publicKey);   // Loaded public key
console.log(keyPair.privateKey);  // Loaded private key
console.log(keyPair.algorithm);   // 'RS512'
```

## Encryption and Decryption

Use the generated key pair with the library's `encrypt` and `decrypt` functions:

```typescript
import { KeyPairGenerator, encrypt, decrypt } from 'riao-iam';

const generator = new KeyPairGenerator({ algorithm: 'RS512' });
const keyPair = generator.generate();

// Encrypt with public key
const encrypted = encrypt(keyPair.publicKey, 'Secret message');

// Decrypt with private key
const decrypted = decrypt(keyPair.privateKey, encrypted);
console.log(decrypted.toString('utf-8')); // 'Secret message'
```

For more info on encryption and decryption, see the [Encryption and Decryption Guide](crypto-guide.md).

## Examples

### Complete Workflow: Generate, Save, and Load

```typescript
import { KeyPairGenerator } from 'riao-iam';
import * as crypto from 'crypto';

// Step 1: Generate a new key pair
const generator = new KeyPairGenerator({ algorithm: 'RS512' });
const keyPair = generator.generate();

// Step 2: Save to files
generator.save({
  keys: keyPair,
  publicKeyPath: './certs/public.pem',
  privateKeyPath: './certs/private.pem'
});

// Step 3: Later, load from files
const loadedKeys = generator.load({
  publicKeyPath: './certs/public.pem',
  privateKeyPath: './certs/private.pem'
});

// Step 4: Use for encryption
import { encrypt, decrypt } from '@riao/iam';
const encrypted = encrypt(loadedKeys.publicKey, 'Hello, World!');
const decrypted = decrypt(loadedKeys.privateKey, encrypted);

console.log(decrypted.toString('utf-8')); // 'Hello, World!'
```

### Choosing the Right Algorithm

- **RS512**: Recommended for most JWT scenarios. Good balance between security and performance.
- **RS384/RS512**: Use when you need higher security levels or longer key material.
- **ES256**: Smaller key size than RSA with similar security. Good for space-constrained environments.
- **ES384/ES512**: Enhanced Elliptic Curve variants for higher security requirements.

### Error Handling

The `KeyPairGenerator` will throw an error for unsupported algorithms:

```typescript
try {
  const generator = new KeyPairGenerator({ algorithm: 'HS256' });
  generator.generate(); // Throws: "Keypair type could not be inferred"
} catch (error) {
  console.error('Invalid algorithm:', error.message);
}
```

## Common Use Cases

### JWT Signing

Use the private key to sign JWTs and the public key for verification:

```typescript
const generator = new KeyPairGenerator({ algorithm: 'RS512' });
const keyPair = generator.generate();

// The keyPair.privateKey can be used with JWT libraries for signing
// The keyPair.publicKey can be used for verification
```

### Certificate Pinning

Save the public key for certificate pinning in your application:

```typescript
const generator = new KeyPairGenerator({ algorithm: 'ES256' });
const keyPair = generator.generate();

generator.save({
  keys: keyPair,
  publicKeyPath: './secure/pin.pem',
  privateKeyPath: './secure/key.pem' // Keep secure
});

// Distribute only the public key to clients
```
