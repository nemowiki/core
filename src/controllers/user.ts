import type { UserDoc, User, UserEmail, UserName } from '../types/user';
import type { Group } from '../types/authority';

import UserModel from '../models/user.js';

export default class UserController {
    static async getUserByEmail(email: UserEmail): Promise<UserDoc | null> {
        return await UserModel.findOne({ email });
    }

    static async getUserByName(name: UserName): Promise<UserDoc | null> {
        return await UserModel.findOne({ name });
    }

    static async updateNameByUserName(prevName: UserName, newName: UserName): Promise<void> {
        await UserModel.findOneAndUpdate({ name: prevName }, { name: newName });
    }

    static async updateGroupByUserName(userName: UserName, group: Group): Promise<void> {
        await UserModel.findOneAndUpdate({ name: userName }, { group });
    }

    static async addContribCntByUserName(userName: UserName, delta = 1): Promise<void> {
        await UserModel.findOneAndUpdate({ name: userName }, { $inc: { contribCnt: delta } });
    }

    static async setUserByEmailAndName(email: UserEmail, name: UserName): Promise<UserDoc> {
        const user = new UserModel<User>({
            email,
            name,
            group: 'user',
            contribCnt: 0,
        });

        return await user.save();
    }

    static async deleteUserByUserEmail(email: UserEmail): Promise<void> {
        await UserModel.findOneAndDelete({ email });
    }
}
