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
import { KeyPairGenerator } from '@riao/iam';

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
import { KeyPairGenerator } from '@riao/iam';

const generator = new KeyPairGenerator({ algorithm: 'RS512' });
const keyPair = generator.generate();

await generator.save({
  keys: keyPair,
  publicKeyPath: './keys/public.pem',
  privateKeyPath: './keys/private.pem'
});
```

The keys are exported in standard PEM format suitable for use with Node.js and other cryptographic libraries.

## Loading Key Pairs

Load previously saved key pairs from files:

```typescript
import { KeyPairGenerator } from '@riao/iam';

const generator = new KeyPairGenerator({ algorithm: 'RS512' });

const keyPair = await generator.load({
  publicKeyPath: './keys/public.pem',
  privateKeyPath: './keys/private.pem'
});

console.log(keyPair.publicKey);   // Loaded public key
console.log(keyPair.privateKey);  // Loaded private key
console.log(keyPair.algorithm);   // 'RS512'
```

## Encryption and Decryption

Once you have a key pair, you can use it for encryption and decryption operations. There are two approaches available:

1. **Recommended**: Use the `Encryptor` and `Decryptor` classes for a reusable, object-oriented interface. See the [Encryptor & Decryptor Guide](encryptor-decryptor-guide.md) for detailed examples and best practices.

2. **Advanced**: Use the lower-level `encrypt()` and `decrypt()` functions for direct control over key handling. See the [Encryption and Decryption Guide](crypto-guide.md) for detailed examples and advanced scenarios.

## Examples

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

await generator.save({
  keys: keyPair,
  publicKeyPath: './secure/pin.pem',
  privateKeyPath: './secure/key.pem' // Keep secure
});

// Distribute only the public key to clients
```
