import type { Penalty, PenaltyId, PenaltyDoc, PenaltyType } from '../types/penalty';
import type { UserEmail } from '../types/user';

import PenaltyModel from '../models/penalty.js';

export default class PenaltyController {
    static async getAllPenaltiesByEmail(penalizedEmail: UserEmail): Promise<PenaltyDoc[]> {
        return await PenaltyModel.find({ penalizedEmail });
    }

    static async getPenaltiesByEmailAndType(
        penalizedEmail: UserEmail,
        penaltyType: PenaltyType,
    ): Promise<PenaltyDoc[]> {
        return await PenaltyModel.find({ penalizedEmail, type: penaltyType });
    }

    static async getPenaltyById(penaltyId: PenaltyId): Promise<PenaltyDoc | null> {
        return await PenaltyModel.findOne({ _id: penaltyId });
    }

    static async setPenaltyByPenalty(penalty: Penalty): Promise<PenaltyDoc> {
        const penaltyDoc = new PenaltyModel(penalty);
        return await penaltyDoc.save();
    }

    static async deletePenaltyById(penaltyId: PenaltyId): Promise<void> {
        await PenaltyModel.findByIdAndDelete(penaltyId);
    }

    static async deletePenaltiesByIdArr(penaltyIdArr: PenaltyId[]): Promise<void> {
        await PenaltyModel.deleteMany({
            _id: penaltyIdArr,
        });
    }
}
