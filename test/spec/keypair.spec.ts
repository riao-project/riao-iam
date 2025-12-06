import 'jasmine';

import { KeyPairAlgorithm, KeyPairGenerator } from '../../src/keypair';
import * as crypto from 'crypto';

describe('KeyPairGenerator', () => {
	it('should allow saving and loading keys from files', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();

		generator.save({
			keys: keypair,
			publicKeyPath: 'test/keys/keypair-public.key',
			privateKeyPath: 'test/keys/keypair-private.key',
		});

		const loaded = generator.load({
			publicKeyPath: 'test/keys/keypair-public.key',
			privateKeyPath: 'test/keys/keypair-private.key',
		});

		expect(loaded.algorithm).toEqual(keypair.algorithm);
		expect(loaded.publicKey).toBeInstanceOf(crypto.KeyObject);
		expect(loaded.privateKey).toBeInstanceOf(crypto.KeyObject);
	});

	it('can encrypt and decrypt with keys', () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();

		const data = Buffer.from('Hello, World!', 'utf-8');

		const encrypted = crypto.publicEncrypt(keypair.publicKey, data);
		const decrypted = crypto.privateDecrypt(keypair.privateKey, encrypted);

		expect(decrypted.toString('utf-8')).toBe(data.toString('utf-8'));
	});

	function checkAlgorithmSupport(algorithm: KeyPairAlgorithm) {
		const generator = new KeyPairGenerator({ algorithm });
		const keypair = generator.generate();

		expect(keypair.publicKey).toBeTruthy();
		expect(keypair.privateKey).toBeTruthy();
		expect(keypair.algorithm).toBe(algorithm);
	}

	it('should generate EC keypair for ES256', () => {
		checkAlgorithmSupport('ES256');
	});

	it('should generate EC keypair for ES384', () => {
		checkAlgorithmSupport('ES384');
	});

	it('should generate EC keypair for ES512', () => {
		checkAlgorithmSupport('ES512');
	});

	it('should generate RSA keypair for RS256', () => {
		checkAlgorithmSupport('RS256');
	});

	it('should generate RSA keypair for RS384', () => {
		checkAlgorithmSupport('RS384');
	});

	it('should generate RSA keypair for RS512', () => {
		checkAlgorithmSupport('RS512');
	});

	it('should throw error for unsupported algorithm', () => {
		const generator = new KeyPairGenerator({ algorithm: 'HS256' });
		expect(() => generator.generate()).toThrowError(
			'Keypair type could not be inferred'
		);
	});
});
