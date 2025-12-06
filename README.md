# @riao/iam - Readme

## Installation

`npm i @riao/iam`

## Encryption & Key Pairs

To use encryption and signing features, you need to generate a key pair. The `KeyPairGenerator` class supports generating RSA and Elliptic Curve key pairs.

### Quick Start with Encryptor/Decryptor (Recommended)

The `Encryptor` and `Decryptor` classes provide a simple, object-oriented interface for managing encryption and decryption:

```typescript
import { Encryptor, Decryptor, KeyPairGenerator } from '@riao/iam';

// Generate a key pair
const generator = new KeyPairGenerator({ algorithm: 'RS256' });
const keypair = generator.generate();

// Create Encryptor and Decryptor instances
const encryptor = new Encryptor(keypair.publicKey);
const decryptor = new Decryptor(keypair.privateKey);

// Encrypt and decrypt
const encrypted = encryptor.encrypt('Secret message');
const decrypted = decryptor.decrypt(encrypted);
console.log(decrypted.toString()); // 'Secret message'
```

### Documentation

- [Encryptor & Decryptor Guide](docs/encryptor-decryptor-guide.md) - **Recommended** - Object-oriented encryption/decryption interface
- [KeyPair Usage Guide](docs/keypair-guide.md) - Learn how to use the KeyPairGenerator for cryptographic operations
- [Encryption & Decryption Guide](docs/crypto-guide.md) - Lower-level `encrypt` and `decrypt` functions (for advanced use cases)
- [Hash Guide](docs/hash-guide.md) - Password hashing and verification with bcrypt

## Contributing & Development

See [contributing.md](docs/contributing/contributing.md) for information on how to develop or contribute to this project!
