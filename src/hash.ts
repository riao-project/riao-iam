import { hash, compare } from 'bcrypt';

export class Hash {
	public rounds: number = 12;

	public async make(input: string, rounds?: number): Promise<string> {
		return await hash(input, rounds || this.rounds);
	}

	public async check(input: string, hashed: string): Promise<boolean> {
		return await compare(input, hashed);
	}
}
