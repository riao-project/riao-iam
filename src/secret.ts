export type SecretAlgorithm = 'HS256' | 'HS384' | 'HS512';

export interface Secret {
	secret: string;
	algorithm: SecretAlgorithm;
}
