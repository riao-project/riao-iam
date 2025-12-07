import 'jasmine';
import {
	encrypt,
	decrypt,
	KeyPairGenerator,
	Encryptor,
	Decryptor,
} from '../../src';
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

describe('Encryptor Class', () => {
	it('should create an Encryptor instance with a public key', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encryptor = new Encryptor(keypair.publicKey);

		expect(encryptor).toBeDefined();
	});

	it('should encrypt data with the Encryptor instance', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encryptor = new Encryptor(keypair.publicKey);
		const data = 'Hello, Encryptor!';

		const encrypted = encryptor.encrypt(data);

		expect(Buffer.isBuffer(encrypted)).toBe(true);
		expect(encrypted.length).toBeGreaterThan(0);
	});

	it('should encrypt string data correctly', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encryptor = new Encryptor(keypair.publicKey);
		const decryptor = new Decryptor(keypair.privateKey);
		const data = 'Sensitive String Data';

		const encrypted = encryptor.encrypt(data);
		const decrypted = decryptor.decrypt(encrypted);

		expect(decrypted.toString()).toEqual(data);
	});

	it('should encrypt Buffer data correctly', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encryptor = new Encryptor(keypair.publicKey);
		const decryptor = new Decryptor(keypair.privateKey);
		const data = Buffer.from('Sensitive Buffer Data', 'utf-8');

		const encrypted = encryptor.encrypt(data);
		const decrypted = decryptor.decrypt(encrypted);

		expect(decrypted.toString('utf-8')).toEqual(data.toString('utf-8'));
	});

	it('should handle large data encryption', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encryptor = new Encryptor(keypair.publicKey);
		const decryptor = new Decryptor(keypair.privateKey);
		const largeData = 'x'.repeat(100);

		const encrypted = encryptor.encrypt(largeData);
		const decrypted = decryptor.decrypt(encrypted);

		expect(decrypted.toString()).toEqual(largeData);
	});

	it('should work with different RSA algorithms', () => {
		const algorithms: Array<'RS256' | 'RS384' | 'RS512'> = [
			'RS256',
			'RS384',
			'RS512',
		];
		for (const algorithm of algorithms) {
			const generator = new KeyPairGenerator({ algorithm });
			const keypair = generator.generate();
			const encryptor = new Encryptor(keypair.publicKey);
			const decryptor = new Decryptor(keypair.privateKey);
			const data = `Test data with ${algorithm}`;

			const encrypted = encryptor.encrypt(data);
			const decrypted = decryptor.decrypt(encrypted);

			expect(decrypted.toString()).toEqual(data);
		}
	});

	it('should produce different ciphertexts for the same plaintext', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encryptor = new Encryptor(keypair.publicKey);
		const data = 'Same data';

		const encrypted1 = encryptor.encrypt(data);
		const encrypted2 = encryptor.encrypt(data);

		expect(encrypted1.toString()).not.toEqual(encrypted2.toString());
	});
});

describe('Decryptor Class', () => {
	it('should create a Decryptor instance with a private key', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const decryptor = new Decryptor(keypair.privateKey);

		expect(decryptor).toBeDefined();
	});

	it('should decrypt data encrypted by Encryptor', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encryptor = new Encryptor(keypair.publicKey);
		const decryptor = new Decryptor(keypair.privateKey);
		const data = 'Confidential Information';

		const encrypted = encryptor.encrypt(data);
		const decrypted = decryptor.decrypt(encrypted);

		expect(decrypted.toString()).toEqual(data);
	});

	it('should handle decryption and return Buffer', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encryptor = new Encryptor(keypair.publicKey);
		const decryptor = new Decryptor(keypair.privateKey);
		const data = 'Test Data';

		const encrypted = encryptor.encrypt(data);
		const decrypted = decryptor.decrypt(encrypted);

		expect(Buffer.isBuffer(decrypted)).toBe(true);
	});

	it('should correctly decrypt data across multiple ' + 'operations', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encryptor = new Encryptor(keypair.publicKey);
		const decryptor = new Decryptor(keypair.privateKey);

		const testData = ['Message 1', 'Message 2', 'Message 3'];
		const encrypted = testData.map((data) => encryptor.encrypt(data));
		const decrypted = encrypted.map((enc) =>
			decryptor.decrypt(enc).toString()
		);

		expect(decrypted).toEqual(testData);
	});

	it(
		'should work correctly with Encryptor and ' + 'Decryptor together',
		() => {
			const generator = new KeyPairGenerator({ algorithm: 'RS256' });
			const keypair = generator.generate();
			const encryptor = new Encryptor(keypair.publicKey);
			const decryptor = new Decryptor(keypair.privateKey);
			const complexData = JSON.stringify({
				user: 'alice',
				role: 'admin',
				id: 12345,
			});

			const encrypted = encryptor.encrypt(complexData);
			const decrypted = decryptor.decrypt(encrypted).toString();
			const parsed = JSON.parse(decrypted);

			expect(parsed).toEqual({ user: 'alice', role: 'admin', id: 12345 });
		}
	);
});
