import type { Doc } from '../types/doc';
import type {
    DocAction,
    UserAction,
    DocLogDoc,
    DocLog,
    UserLogDoc,
    PenaltyLog,
    PenaltyAction,
    PenaltyLogDoc,
} from '../types/log';
import type { Penalty } from '../types/penalty';
import type { User, UserEmail, UserName } from '../types/user';
import type { Info } from '../types/info';
import { WikiResponse } from '../types/general';

import UserController from '../controllers/user.js';
import MetaController from '../controllers/meta.js';
import LogController from '../controllers/log.js';
import InfoController from '../controllers/info.js';

import GeneralUtils from '../utils/general.js';

export default class LogManager {
    static #makeSystemLogByDocAction(
        action: DocAction,
        prevInfo: Info | null,
        nextInfo: Info,
    ): string {
        if (action === 'create' && nextInfo.type === 'category') return '[분류 생성]';
        else if (action === 'delete' && nextInfo.type === 'category') return '[분류 삭제]';
        else if (action === 'delete' && nextInfo.type !== 'category') return '';
        else if (action === 'move') return `${prevInfo?.fullTitle || ''}→${nextInfo.fullTitle}`;
        else if (action === 'change_authority') {
            if (!prevInfo?.authority) throw new Error('The authority of prevInfo must exist!');

            return (Object.keys(nextInfo.authority) as DocAction[]).reduce(
                (prev: string, docAction: DocAction) => {
                    const prevAuthority = prevInfo.authority[docAction] || [];
                    const nextAuthority = nextInfo.authority[docAction] || [];
                    if (!GeneralUtils.isSameArr(prevAuthority, nextAuthority))
                        return `[${docAction}]: (${prevAuthority})→(${nextAuthority})`;
                    else return prev;
                },
                '',
            );
        } else if (action === 'change_state') {
            if (nextInfo.state === 'hidden') return `[숨김]`;
            else if (nextInfo.state === 'deleted') return `[숨김 해제]`;
            else throw new Error("The state of next info must be either 'hidden' or 'deleted'!");
        } else return '';
    }

    static async setDocLogByActionAndDoc(
        action: DocAction,
        prevDoc: Doc | null,
        nextDoc: Doc,
        user: User,
        comment?: string,
    ): Promise<DocLogDoc> {
        const delta =
            GeneralUtils.calcByte(nextDoc.markup) - GeneralUtils.calcByte(prevDoc?.markup || '');

        const systemLog = this.#makeSystemLogByDocAction(action, prevDoc, nextDoc);

        await MetaController.addContribCnt(1);

        await UserController.addContribCntByUserName(user.name, 1);

        const docLog: DocLog = {
            docId: nextDoc.docId,
            fullTitle: nextDoc.fullTitle,
            revision: nextDoc.revision,
            delta,
            userEmail: user.email,
            userName: user.name,
            comment: comment || '',
            systemLog,
            action,
            time: new Date(),
        };

        return await LogController.setDocLogByDocLog(docLog);
    }

    static async setDocLogByActionAndInfo(
        action: DocAction,
        prevInfo: Info | null,
        nextInfo: Info,
        user: User,
        comment?: string,
    ): Promise<DocLogDoc> {
        const systemLog = this.#makeSystemLogByDocAction(action, prevInfo, nextInfo);

        await MetaController.addContribCnt(1);

        await UserController.addContribCntByUserName(user.name, 1);

        const docLog: DocLog = {
            docId: nextInfo.docId,
            fullTitle: nextInfo.fullTitle,
            revision: nextInfo.revision,
            delta: 0,
            userEmail: user.email,
            userName: user.name,
            comment: comment || '',
            systemLog,
            action,
            time: new Date(),
        };

        return await LogController.setDocLogByDocLog(docLog);
    }

    static async setUserLogByEmailAndAction(
        email: UserEmail,
        action: UserAction,
        systemLog?: string,
    ): Promise<UserLogDoc> {
        const userLog = {
            action,
            userEmail: email,
            systemLog: systemLog || '',
            time: new Date(),
        };
        return await LogController.setUserLogByUserLog(userLog);
    }

    static async setPenaltyLogByPenaltyAndAction(
        penalty: Penalty,
        action: PenaltyAction,
    ): Promise<PenaltyLogDoc> {
        const penaltyLog: PenaltyLog = {
            action,
            penaltyType: penalty.type,
            userEmail: penalty.penalizerEmail,
            penalizedEmail: penalty.penalizedEmail,
            duration: penalty.duration,
            comment: penalty.comment,
            time: new Date(),
        };
        return await LogController.setPenaltyLogByPenaltyLog(penaltyLog);
    }

    static async getDocLogsByFullTitle(
        fullTitle: string,
        page: number,
        cnt = 10,
    ): Promise<WikiResponse<DocLogDoc[]>> {
        if (cnt <= 0) return { ok: false, reason: '개수가 0이상이어야 합니다.' };

        const docInfo = await InfoController.getInfoByFullTitle(fullTitle);
        if (!docInfo) return { ok: false, reason: '문서가 존재하지 않습니다.' };

        const skip = (page - 1) * cnt;
        const limit = cnt;

        const value = await LogController.getDocLogsByDocId(docInfo.docId, limit, skip);

        return { ok: true, value };
    }

    static async getDocLogsByUserName(
        userName: UserName,
        page: number,
        cnt = 10,
    ): Promise<WikiResponse<DocLogDoc[]>> {
        if (cnt <= 0) return { ok: false, reason: '개수가 0이상이어야 합니다.' };

        const user = await UserController.getUserByName(userName);
        if (!user) return { ok: false, reason: '존재하지 않는 사용자입니다.' };

        const skip = (page - 1) * cnt;
        const limit = cnt;

        const value = await LogController.getDocLogsByUserName(userName, limit, skip);

        return { ok: true, value };
    }
}
