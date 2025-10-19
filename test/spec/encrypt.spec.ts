import { encrypt, decrypt } from '../../src/encrypt';
import { KeyPairGenerator } from '../../src/keypair';

describe('Encrypt', () => {
	it('can encrypt and decrypt data using public and private keys', async () => {
		const generator = new KeyPairGenerator({ algorithm: 'RS256' });
		const keypair = generator.generate();
		const encrypted = encrypt(keypair.publicKey, 'Hello, World!');
		const decrypted = decrypt(keypair.privateKey, encrypted);

		expect(decrypted.toString()).toEqual('Hello, World!');
	});
});
