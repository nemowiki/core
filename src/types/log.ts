import type { HydratedDocument } from 'mongoose';
import type { DocId } from './doc';
import type { UserEmail, UserName } from './user';
import type { PenaltyType } from './penalty';

export type DocAction =
    | 'read'
    | 'create'
    | 'edit'
    | 'move'
    | 'delete'
    | 'change_authority'
    | 'change_state';
export type UserAction = 'signup' | 'change_name' | 'change_group';
export type PenaltyAction = 'apply' | 'remove';

export interface PenaltyLog {
    userEmail: UserEmail;
    comment: string;
    action: PenaltyAction;
    penaltyType: PenaltyType;
    penalizedEmail: UserEmail;
    duration: number;
    time: Date;
}

export interface UserLog {
    userEmail: UserEmail;
    systemLog: string;
    action: UserAction;
    time: Date;
}

export interface DocLog {
    docId: DocId;
    fullTitle: string;
    revision: number;
    delta: number;

    userEmail: UserEmail;
    userName: UserName;
    comment: string;

    action: DocAction;
    systemLog: string;
    time: Date;
}

export type DocLogDoc = HydratedDocument<DocLog>;
export type UserLogDoc = HydratedDocument<UserLog>;
export type PenaltyLogDoc = HydratedDocument<PenaltyLog>;
