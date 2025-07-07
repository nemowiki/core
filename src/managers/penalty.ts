import type { User, UserName } from '../types/user';
import type { PenaltyDoc, PenaltyType, PenaltyId } from '../types/penalty';
import { WikiResponse, WikiResponseWithData } from '../types/general';

import UserController from '../controllers/user.js';
import PenaltyController from '../controllers/penalty.js';

import AuthorityManager from './authority.js';
import UserManager from './user.js';
import LogManager from './log.js';

export default class PenaltyManager {
    static async #applyPenalty(
        penaltyType: PenaltyType,
        penalizedName: UserName,
        duration: number,
        comment: string,
        penalizer: User,
    ): Promise<WikiResponse> {
        const penalizedUser = await UserController.getUserByName(penalizedName);
        if (!penalizedUser) return { ok: false, reason: '사용자가 존재하지 않습니다.' };

        const res_penalty = AuthorityManager.canApplyPenalty(
            penalizedUser.group,
            duration,
            penalizer.group,
        );
        if (!res_penalty.ok) return res_penalty;

        const penalty = {
            penalizedEmail: penalizedUser.email,
            penalizerEmail: penalizer.email,
            type: penaltyType,
            until: new Date(new Date().getTime() + duration * 60 * 1000),
            duration,
            comment,
        };

        await PenaltyController.setPenaltyByPenalty(penalty);
        await LogManager.setPenaltyLogByPenaltyAndAction(penalty, 'apply');

        if (penaltyType === 'block')
            await UserManager.changeGroupByEmail(penalizedUser.email, 'blocked', penalizer);

        return { ok: true, reason: '' };
    }

    static async blockUserByName(
        penalizedName: UserName,
        duration: number,
        comment: string,
        penalizer: User,
    ): Promise<WikiResponse> {
        return await this.#applyPenalty('block', penalizedName, duration, comment, penalizer);
    }

    static async warnUserByName(
        penalizedName: UserName,
        duration: number,
        comment: string,
        penalizer: User,
    ): Promise<WikiResponse> {
        return await this.#applyPenalty('warn', penalizedName, duration, comment, penalizer);
    }

    static async #removePenalty(
        penaltyId: PenaltyId,
        comment: string,
        penalizer: User,
    ): Promise<WikiResponseWithData<PenaltyDoc | undefined>> {
        const res_penalty = AuthorityManager.canRemovePenalty(penalizer.group);
        if (!res_penalty.ok) return { ...res_penalty, data: undefined };

        const penalty = await PenaltyController.getPenaltyById(penaltyId);

        if (!penalty)
            return { ok: false, reason: '경고 및 차단 내역이 존재하지 않습니다.', data: undefined };

        await PenaltyController.deletePenaltyById(penaltyId);

        penalty.penalizerEmail = penalizer.email;
        penalty.comment = comment;
        await LogManager.setPenaltyLogByPenaltyAndAction(penalty, 'remove');

        return { ok: true, reason: '', data: penalty };
    }

    static async removePenaltyById(
        penaltyId: PenaltyId,
        comment: string,
        penalizer: User,
    ): Promise<WikiResponse> {
        const penalty = await this.#removePenalty(penaltyId, comment, penalizer);
        if (!penalty.ok) return penalty;

        if (penalty.data?.type === 'block') {
            const penaltyArr = await PenaltyController.getPenaltiesByEmailAndType(
                penalty.data.penalizedEmail,
                'block',
            );
            if (penaltyArr.length === 0)
                await UserManager.changeGroupByEmail(
                    penalty.data.penalizedEmail,
                    'user',
                    penalizer,
                );
        }

        return { ok: true, reason: '' };
    }

    static async refreshPenaltiesByName(
        penalizedName: UserName,
    ): Promise<WikiResponseWithData<PenaltyDoc[]>> {
        const user = await UserController.getUserByName(penalizedName);
        if (!user) return { ok: false, reason: '사용자가 존재하지 않습니다.', data: [] };

        const penaltyArr = await PenaltyController.getAllPenaltiesByEmail(user.email);
        const validPenaltyArr: PenaltyDoc[] = [];
        const expiredPenaltyIdArr: PenaltyId[] = [];

        for (let penalty of penaltyArr) {
            if (penalty.duration !== 0 && new Date(penalty.until).getTime() < new Date().getTime())
                expiredPenaltyIdArr.push(penalty._id as PenaltyId);
            else validPenaltyArr.push(penalty);
        }

        await PenaltyController.deletePenaltiesByIdArr(expiredPenaltyIdArr);

        if (user.group === 'blocked') {
            const isBlocked = validPenaltyArr.reduce((prev, penalty) => {
                if (penalty.type === 'block') return true;
                else return prev;
            }, false);
            if (!isBlocked)
                await UserManager.changeGroupByEmail(
                    user.email,
                    'user',
                    AuthorityManager.getSystemUser(),
                );
        }

        return { ok: true, reason: '', data: validPenaltyArr };
    }
}
