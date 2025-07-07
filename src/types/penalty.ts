import type { HydratedDocument, Types } from 'mongoose';
import type { UserEmail } from './user';
import type { Branded } from './general';

export type PenaltyType = 'block' | 'warn' | 'etc';
export type PenaltyId = Branded<Types.ObjectId, 'penaltyId'>;

export interface Penalty {
    penalizedEmail: UserEmail;
    penalizerEmail: UserEmail;
    type: PenaltyType;
    until: Date;
    duration: number;
    comment: string;
}

// export interface Penalty {
//     email: UserEmail,
//     penaltyArr: {
//         penalizerEmail: UserEmail,
//         name: PenaltyName,
//         until: Date,
//         duration: Number,
//         comment: string,
//     }[]
// }

export type PenaltyDoc = HydratedDocument<Penalty>;
