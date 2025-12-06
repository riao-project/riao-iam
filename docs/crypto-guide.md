# Encryption and Decryption Guide

> **Note**: For most use cases, we recommend using the [`Encryptor` and `Decryptor` classes](encryptor-decryptor-guide.md) instead of passing keys around your application. This guide is intended for advanced users who need direct access to encryption functions.

The `encrypt` and `decrypt` functions provide a lower-level interface for public-key cryptography operations using RSA key pairs. These functions are ideal for advanced scenarios or when you need direct control over key handling.

## Table of Contents

- [Overview](#overview)
- [Function Signatures](#function-signatures)
- [The `encrypt` Function](#the-encrypt-function)
- [The `decrypt` Function](#the-decrypt-function)
- [Usage Examples](#usage-examples)
- [Security Considerations](#security-considerations)
- [Error Handling](#error-handling)
- [Integration with KeyPairGenerator](#integration-with-keypairgenerator)

## Overview

The `encrypt` and `decrypt` functions use RSA public-key cryptography to secure data:

- **`encrypt`**: Uses a public key to encrypt data. Anyone can encrypt with a public key, but only the holder of the corresponding private key can decrypt.
- **`decrypt`**: Uses a private key to decrypt data encrypted with the corresponding public key.

This asymmetric encryption approach is perfect for scenarios where:
- Multiple parties need to send encrypted data to a single recipient
- Data is stored with a public key and retrieved with a private key
- Building secure communication channels with non-repudiation

## The `encrypt` Function

The `encrypt` function encrypts data using RSA public-key encryption. The function accepts data as either a string or Buffer and internally converts strings to Buffers for processing.

### How it works

1. Converts string input to a Buffer (if necessary)
2. Uses Node.js `crypto.publicEncrypt()` to encrypt the data
3. Returns the encrypted data as a Buffer

### Example

```typescript
import { encrypt } from '@riao/iam';
import * as crypto from 'crypto';

// Assuming you have a publicKey from KeyPairGenerator
const publicKey: crypto.KeyObject = /* ... */;

// Encrypt a string
const encrypted = encrypt(publicKey, 'Secret data');
console.log(encrypted); // Buffer: <Buffer 45 f3 22 ...>

// Encrypt a Buffer
const dataBuffer = Buffer.from('Secret data');
const encrypted2 = encrypt(publicKey, dataBuffer);
```

## The `decrypt` Function

The `decrypt` function reverses the encryption process using the corresponding private key. Only the holder of the private key can decrypt data that was encrypted with the public key.

### How it works

1. Takes an encrypted Buffer and the private key
2. Uses Node.js `crypto.privateDecrypt()` to decrypt the data
3. Returns the decrypted data as a Buffer

### Example

```typescript
import { decrypt } from '@riao/iam';

// Assuming you have encryptedData and privateKey
const decrypted = decrypt(privateKey, encryptedData);
console.log(decrypted.toString('utf-8')); // Original message
```

## Usage Examples

### Complete Encrypt/Decrypt Workflow

```typescript
import { encrypt, decrypt } from '@riao/iam';
import { KeyPairGenerator } from '@riao/iam';

// Step 1: Generate a key pair
const generator = new KeyPairGenerator({ algorithm: 'RS512' });
const keyPair = generator.generate();

// Step 2: Encrypt data with public key
const originalData = 'Sensitive information';
const encrypted = encrypt(keyPair.publicKey, originalData);
console.log('Encrypted:', encrypted);

// Step 3: Decrypt data with private key
const decrypted = decrypt(keyPair.privateKey, encrypted);
console.log('Decrypted:', decrypted.toString('utf-8')); // 'Sensitive information'
```

### Encrypting JSON Data

```typescript
import { encrypt, decrypt } from '@riao/iam';

const keyPair = generator.generate();

// Encrypt a JSON object
const userData = {
  id: 123,
  email: 'user@example.com',
  isAdmin: false
};

const jsonString = JSON.stringify(userData);
const encrypted = encrypt(keyPair.publicKey, jsonString);

// Later, decrypt and parse
const decrypted = decrypt(keyPair.privateKey, encrypted);
const restored = JSON.parse(decrypted.toString('utf-8'));
console.log(restored); // { id: 123, email: 'user@example.com', isAdmin: false }
```

### Multiple Recipients Scenario

```typescript
import { encrypt } from '@riao/iam';

// Different recipients with their own key pairs
const recipient1 = new KeyPairGenerator({ algorithm: 'RS512' }).generate();
const recipient2 = new KeyPairGenerator({ algorithm: 'RS512' }).generate();

const message = 'Broadcast message';

// Encrypt the same message for multiple recipients
const encryptedFor1 = encrypt(recipient1.publicKey, message);
const encryptedFor2 = encrypt(recipient2.publicKey, message);

// Each recipient can decrypt with their own private key
const decrypted1 = decrypt(recipient1.privateKey, encryptedFor1);
const decrypted2 = decrypt(recipient2.privateKey, encryptedFor2);
```

### File-based Encryption

```typescript
import { encrypt, decrypt } from '@riao/iam';
import { KeyPairGenerator } from '@riao/iam';
import * as fs from 'fs';

const generator = new KeyPairGenerator({ algorithm: 'RS512' });

// Load keys from files
const keyPair = generator.load({
  publicKeyPath: './keys/public.pem',
  privateKeyPath: './keys/private.pem'
});

// Encrypt file contents
const fileContents = fs.readFileSync('./sensitive-data.txt');
const encrypted = encrypt(keyPair.publicKey, fileContents);
fs.writeFileSync('./sensitive-data.enc', encrypted);

// Decrypt file
const encryptedData = fs.readFileSync('./sensitive-data.enc');
const decrypted = decrypt(keyPair.privateKey, encryptedData);
fs.writeFileSync('./sensitive-data-restored.txt', decrypted);
```

## Security Considerations

### Key Management

- **Private Key Protection**: Keep your private key secure and never share it. Consider storing it in a secure vault or HSM (Hardware Security Module).
- **Public Key Distribution**: The public key can be safely distributed to anyone who needs to encrypt data for you.
- **Key Rotation**: Regularly rotate keys and securely delete old private keys.

### Data Size Limitations

RSA encryption has limitations on data size:

- **RS512 (4096-bit)**: Can encrypt up to ~500 bytes per operation
- **RS384 (3072-bit)**: Can encrypt up to ~382 bytes per operation
- **RS256 (2048-bit)**: Can encrypt up to ~245 bytes per operation

For larger data, consider:
1. Using symmetric encryption (AES) for the data and RSA for the key
2. Splitting the data into smaller chunks
3. Using hybrid encryption schemes

### Algorithm Selection

- **RS512**: Recommended for most use cases. Provides strong security with 4096-bit keys.
- **RS384**: Good balance between security and performance with 3072-bit keys.
- **RS256**: Suitable for lightweight scenarios but with slightly lower security margin (2048-bit keys).

## Error Handling

### Common Errors

```typescript
import { encrypt, decrypt } from '@riao/iam';

try {
  // Error: privateKey cannot be used for encryption
  const encrypted = encrypt(keyPair.privateKey, 'data');
} catch (error) {
  console.error('Encryption failed:', error.message);
}

try {
  // Error: publicKey cannot be used for decryption
  const decrypted = decrypt(keyPair.publicKey, encryptedData);
} catch (error) {
  console.error('Decryption failed:', error.message);
}

try {
  // Error: Invalid encrypted data
  const decrypted = decrypt(keyPair.privateKey, Buffer.from('invalid'));
} catch (error) {
  console.error('Decryption failed:', error.message);
}
```

## Integration with KeyPairGenerator

The `encrypt` and `decrypt` functions are designed to work seamlessly with `KeyPairGenerator`:

```typescript
import { encrypt, decrypt, KeyPairGenerator } from '@riao/iam';

// Generate keys
const generator = new KeyPairGenerator({ algorithm: 'RS512' });
const keyPair = generator.generate();

// Use with encryption functions
const data = 'Confidential';
const encrypted = encrypt(keyPair.publicKey, data);
const decrypted = decrypt(keyPair.privateKey, encrypted);
```

For more details on generating and managing key pairs, see the [KeyPair Usage Guide](keypair-guide.md).

**For most applications, consider using the `Encryptor` and `Decryptor` classes instead**, which provide a more convenient object-oriented interface:

```typescript
import { Encryptor, Decryptor, KeyPairGenerator } from '@riao/iam';

const generator = new KeyPairGenerator({ algorithm: 'RS512' });
const keyPair = generator.generate();

const encryptor = new Encryptor(keyPair.publicKey);
const decryptor = new Decryptor(keyPair.privateKey);

// Cleaner, reusable interface
const encrypted = encryptor.encrypt('Confidential');
const decrypted = decryptor.decrypt(encrypted);
```

See the [Encryptor & Decryptor Guide](encryptor-decryptor-guide.md) for more information.
