import type { DocId } from '../types/doc';
import type {
    DocLogDoc,
    DocLog,
    UserLogDoc,
    UserLog,
    PenaltyLog,
    PenaltyLogDoc,
} from '../types/log';
import type { UserEmail, UserName } from '../types/user';

import { UserLogModel, DocLogModel, PenaltyLogModel } from '../models/log.js';

export default class LogController {
    // ============ Doc Logs ==============

    static async setDocLogByDocLog(docLog: DocLog): Promise<DocLogDoc> {
        const docLogDoc = new DocLogModel(docLog);
        return await docLogDoc.save();
    }

    static async updateNamesOfAllDocLogsByEmail(userEmail: UserEmail, userName: UserName) {
        await DocLogModel.updateMany({ userEmail }, { userName });
    }

    static async updateFullTitlesOfAllDocLogsByDocId(docId: DocId, fullTitle: string) {
        await DocLogModel.updateMany({ docId }, { fullTitle });
    }

    static async getRecentWriteLogs(count: number = 10): Promise<Array<DocLogDoc>> {
        return await DocLogModel.find({
            action: ['create', 'edit'],
        })
            .sort({ createdAt: -1 })
            .limit(count);
    }

    static async getDocLogsByDocId(
        docId: DocId,
        limit: number,
        skip = 0,
    ): Promise<Array<DocLogDoc>> {
        return await DocLogModel.find({
            docId,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
    }

    static async getDocLogsByUserName(
        userName: UserName,
        limit: number,
        skip = 0,
    ): Promise<Array<DocLogDoc>> {
        return await DocLogModel.find({
            userName,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
    }

    // ============ User Logs ==============

    static async setUserLogByUserLog(userLog: UserLog): Promise<UserLogDoc> {
        const log = new UserLogModel(userLog);
        return await log.save();
    }

    static async getMostRecentChangeNameLogByEmail(
        userEmail: UserEmail,
    ): Promise<UserLogDoc | null> {
        return (
            (
                await UserLogModel.find({ userEmail, action: 'change_name' })
                    .sort({ createdAt: -1 })
                    .limit(1)
            )[0] || null
        );
    }

    // ============ Penalty Logs ==============

    static async setPenaltyLogByPenaltyLog(penaltyLog: PenaltyLog): Promise<PenaltyLogDoc> {
        const log = new PenaltyLogModel(penaltyLog);
        return await log.save();
    }
}
