export interface Principal {
	id: string;
	type: 'user' | 'service' | 'system' | 'bot';
	login: string;
	name: string;
	create_timestamp: Date;
	deactivate_timestamp?: Date;
}
