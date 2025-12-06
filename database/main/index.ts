import { DatabasePostgres18 } from '@riao/postgres';

export default class MainDatabase extends DatabasePostgres18 {
	override name = 'main';
}

export const maindb = new MainDatabase();
