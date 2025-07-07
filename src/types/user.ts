import type { HydratedDocument } from 'mongoose';
import type { Group } from './authority';
import type { Branded } from './general';

export type UserEmail = Branded<string, 'email'>;
export type UserName = Branded<string, 'name'>;

export interface User {
    email: UserEmail;
    name: UserName;
    group: Group;
    contribCnt: number;
}

export type UserDoc = HydratedDocument<User>;
