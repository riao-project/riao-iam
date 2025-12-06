import 'jasmine';
import { encrypt, decrypt, KeyPairGenerator } from '../../src';
import { readFileSync, writeFileSync } from 'fs';

describe('Encrypt', () => {
	it('can encrypt and decrypt data using keypair', async () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encrypted = encrypt(keypair.publicKey, 'Hello, World!');
		const decrypted = decrypt(keypair.privateKey, encrypted);

		expect(decrypted.toString()).toEqual('Hello, World!');
	});

	it('can encrypt and decrypt string data', async () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const data = 'Sensitive Information';
		const encrypted = encrypt(keypair.publicKey, data);
		writeFileSync('test/keys/encrypted-data.bin', encrypted);

		const loaded = readFileSync('test/keys/encrypted-data.bin');
		const decrypted = decrypt(keypair.privateKey, loaded);

		expect(decrypted.toString()).toEqual(data);
	});

	it('can encrypt a Buffer', async () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const data = Buffer.from('Buffer Data Example', 'utf-8');
		const encrypted = encrypt(keypair.publicKey, data);
		const decrypted = decrypt(keypair.privateKey, encrypted);
		expect(decrypted.toString('utf-8')).toEqual(data.toString('utf-8'));
	});

	it('can encrypt with RS384 and decrypt correctly', async () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS384' });
		const keypair = generator.generate();
		const data = 'RS384 Encryption Test';
		const encrypted = encrypt(keypair.publicKey, data);
		const decrypted = decrypt(keypair.privateKey, encrypted);
		expect(decrypted.toString()).toEqual(data);
	});

	it('can encrypt with RS512 and decrypt correctly', async () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS512' });
		const keypair = generator.generate();
		const data = 'RS512 Encryption Test';
		const encrypted = encrypt(keypair.publicKey, data);
		const decrypted = decrypt(keypair.privateKey, encrypted);
		expect(decrypted.toString()).toEqual(data);
	});
});
