import { columnName } from '@riao/dbal';
import { AuthorizationBase, AuthorizationLookup } from './authorization-base';
import { AuthorizationError } from './errors/authorization-error';
import { AuthOptions } from './auth';

export interface RoleBasedAuthorizationOptions extends AuthOptions {
	permissionTable?: string;
	userRoleTable?: string;
	rolePermissionTable?: string;
}

export class RoleBasedAuthorization extends AuthorizationBase {
	protected userTable;
	protected permissionTable;
	protected userRoleTable;
	protected rolePermissionTable;

	public constructor(options: RoleBasedAuthorizationOptions) {
		super(options);

		this.userTable = this.userTable ?? 'users';
		this.permissionTable = this.permissionTable ?? 'permissions';
		this.userRoleTable = this.userRoleTable ?? 'user_roles';
		this.rolePermissionTable =
			this.rolePermissionTable ?? 'role_permissions';
	}

	public async check(lookup: AuthorizationLookup): Promise<void> {
		const found = await this.db.query.findOne({
			table: this.permissionTable,
			columns: [`${this.permissionTable}.id`],
			join: [
				{
					type: 'INNER',
					table: this.rolePermissionTable,
					on: {
						[`${this.rolePermissionTable}.permission_id`]:
							columnName(`${this.permissionTable}.id`),
					},
				},
				{
					type: 'INNER',
					table: this.userRoleTable,
					on: {
						[`${this.userRoleTable}.role_id`]: columnName(
							`${this.rolePermissionTable}.role_id`
						),
					},
				},
			],
			where: {
				[`${this.userRoleTable}.user_id`]: lookup.user,
				[`${this.permissionTable}.action`]: lookup.action,
				[`${this.permissionTable}.model`]: lookup.model,
			},
		});

		if (!found) {
			throw new AuthorizationError();
		}
	}
}
