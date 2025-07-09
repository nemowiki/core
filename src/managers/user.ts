import type { Group } from '../types/authority';
import type { User, UserDoc, UserEmail, UserName } from '../types/user';

import UserController from '../controllers/user.js';
import LogController from '../controllers/log.js';
import MetaController from '../controllers/meta.js';

import AuthorityManager from './authority.js';
import LogManager from './log.js';
import { WikiResponse } from '../types';

export default class UserManager {
    static async signinUserByEmail(email: UserEmail): Promise<WikiResponse<User | null>> {
        // TODO: Will this function be used?
        const user = await UserController.getUserByEmail(email);
        if (!user) return { ok: false, reason: '사용자가 존재하지 않습니다.' };

        // await LogController.setUserLogByEmailAndAction(email, 'signin', `name: ${user.name}`);
        return { ok: true, value: user };
    }

    static async signupUserByEmailAndName(
        email: UserEmail,
        name: UserName,
    ): Promise<WikiResponse<UserDoc>> {
        let user = await UserController.getUserByEmail(email);
        if (user) return { ok: false, reason: '이미 가입된 사용자입니다.' };

        user = await UserController.getUserByName(name);
        while (user) {
            name = (name + '_') as UserName;
            user = await UserController.getUserByName(name);
        }

        await LogManager.setUserLogByEmailAndAction(email, 'signup', `name: ${name}`);
        await MetaController.addUserCnt(1);
        const userDoc = await UserController.setUserByEmailAndName(email, name);
        return { ok: true, value: userDoc };
    }

    static async changeNameByName(
        userName: UserName,
        newName: UserName,
        operator: User,
    ): Promise<WikiResponse<void>> {
        const user = await UserController.getUserByName(userName);
        if (!user) return { ok: false, reason: '사용자가 존재하지 않습니다.' };
        const prevName = user.name;

        if (!AuthorityManager.canChangeName(user, operator))
            return { ok: false, reason: '이름 변경 권한이 없습니다.' };

        const changeNameLog = await LogController.getMostRecentChangeNameLogByEmail(user.email);

        if (
            changeNameLog &&
            new Date(changeNameLog.time).getTime() < new Date().getTime() + 30 * 24 * 60 * 60 * 1000
        )
            return { ok: false, reason: '마지막 이름 변경이 30일 이내입니다.' };

        await UserController.updateNameByUserName(prevName, newName);
        await LogController.updateNamesOfAllDocLogsByEmail(user.email, newName);
        await LogManager.setUserLogByEmailAndAction(
            user.email,
            'change_name',
            `${prevName}→${newName} by ${operator.email}`,
        );
        return { ok: true };
    }

    static async #changeGroupByUser(
        user: UserDoc | null,
        group: Group,
        operator: User,
    ): Promise<WikiResponse<void>> {
        if (!user) return { ok: false, reason: '사용자가 존재하지 않습니다.' };

        if (!AuthorityManager.canChangeGroup(user, operator))
            return { ok: false, reason: '그룹 변경 권한이 없습니다.' };

        await LogManager.setUserLogByEmailAndAction(
            user.email,
            'change_group',
            `${user.group}→${group} by ${operator.email}`,
        );
        await UserController.updateGroupByUserName(user.name, group);
        return { ok: true };
    }

    static async changeGroupByName(
        userName: UserName,
        group: Group,
        operator: User,
    ): Promise<WikiResponse<void>> {
        if (!['user', 'manager'].includes(group))
            return { ok: false, reason: "The group of user can only be 'user' or 'manager'!" };
        const user = await UserController.getUserByName(userName);
        const res = await this.#changeGroupByUser(user, group, operator);
        return res;
    }

    static async changeGroupByEmail(
        userEmail: UserEmail,
        group: Group,
        operator: User,
    ): Promise<WikiResponse<void>> {
        if (!['user', 'blocked'].includes(group))
            return { ok: false, reason: 'This function is made for blocking and unblocking user!' };
        const user = await UserController.getUserByEmail(userEmail);
        const res = await this.#changeGroupByUser(user, group, operator);
        return res;
    }

    static async removeUserByEmail(email: UserEmail): Promise<WikiResponse<void>> {
        const user = await UserController.getUserByEmail(email);
        if (!user) return { ok: false, reason: '사용자가 존재하지 않습니다.' };

        await LogController.updateNamesOfAllDocLogsByEmail(email, '(삭제된 사용자)' as UserName);
        await UserController.deleteUserByUserEmail(email);
        return { ok: true };
    }
}
