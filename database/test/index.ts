import { DatabaseSqlite } from '@riao/sqlite';

export default class TestDatabase extends DatabaseSqlite {
	override name = 'test';
}

export const testdb = new TestDatabase();
