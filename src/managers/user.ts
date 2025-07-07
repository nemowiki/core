import type { Group } from '../types/authority';
import type { User, UserDoc, UserEmail, UserName } from '../types/user';

import UserController from '../controllers/user.js';
import LogController from '../controllers/log.js';
import MetaController from '../controllers/meta.js';

import AuthorityManager from './authority.js';
import LogManager from './log.js';

export default class UserManager {
    static async signinUserByEmail(email: UserEmail): Promise<User | null> {
        // TODO: Will this function be used?
        const user = await UserController.getUserByEmail(email);
        if (!user) return null;

        // await LogController.setUserLogByEmailAndAction(email, 'signin', `name: ${user.name}`);
        return user;
    }

    static async signupUserByEmailAndName(email: UserEmail, name: UserName): Promise<UserDoc> {
        let user = await UserController.getUserByEmail(email);
        if (user) throw new Error('This user is already signed up!');

        user = await UserController.getUserByName(name);
        while (user) {
            name = (name + '_') as UserName;
            user = await UserController.getUserByName(name);
        }

        await LogManager.setUserLogByEmailAndAction(email, 'signup', `name: ${name}`);
        await MetaController.addUserCnt(1);
        return await UserController.setUserByEmailAndName(email, name);
    }

    static async changeNameByName(
        userName: UserName,
        newName: UserName,
        operator: User,
    ): Promise<void> {
        const user = await UserController.getUserByName(userName);
        if (!user) throw new Error('The user does not exist!');
        const prevName = user.name;

        if (!AuthorityManager.canChangeName(user, operator)) throw new Error('Cannot change name!');

        const changeNameLog = await LogController.getMostRecentChangeNameLogByEmail(user.email);

        if (
            changeNameLog &&
            new Date(changeNameLog.time).getTime() < new Date().getTime() + 30 * 24 * 60 * 60 * 1000
        )
            throw new Error('You can change your name only once every 30 days.');

        await UserController.updateNameByUserName(prevName, newName);
        await LogController.updateNamesOfAllDocLogsByEmail(user.email, newName);
        await LogManager.setUserLogByEmailAndAction(
            user.email,
            'change_name',
            `${prevName}→${newName} by ${operator.email}`,
        );
    }

    static async #changeGroupByUser(
        user: UserDoc | null,
        group: Group,
        operator: User,
    ): Promise<void> {
        if (!user) throw new Error('The user does not exist!');

        if (!AuthorityManager.canChangeGroup(user, operator))
            throw new Error('Cannot change group!');

        await LogManager.setUserLogByEmailAndAction(
            user.email,
            'change_group',
            `${user.group}→${group} by ${operator.email}`,
        );
        await UserController.updateGroupByUserName(user.name, group);
    }

    static async changeGroupByName(
        userName: UserName,
        group: Group,
        operator: User,
    ): Promise<void> {
        if (!['user', 'manager'].includes(group))
            throw new Error("The group of user can only be 'user' or 'manager'!");
        const user = await UserController.getUserByName(userName);
        await this.#changeGroupByUser(user, group, operator);
    }

    static async changeGroupByEmail(
        userEmail: UserEmail,
        group: Group,
        operator: User,
    ): Promise<void> {
        if (!['user', 'blocked'].includes(group))
            throw new Error('This function is made for blocking and unblocking user!');
        const user = await UserController.getUserByEmail(userEmail);
        await this.#changeGroupByUser(user, group, operator);
    }

    static async removeUserByEmail(email: UserEmail): Promise<void> {
        const user = await UserController.getUserByEmail(email);
        if (!user) throw new Error('The user does not exist!');

        await LogController.updateNamesOfAllDocLogsByEmail(email, '(삭제된 사용자)' as UserName);
        await UserController.deleteUserByUserEmail(email);
    }
}
