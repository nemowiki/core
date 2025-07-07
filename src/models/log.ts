import mongoose from 'mongoose';
import type { DocLog, PenaltyLog, UserLog } from '../types/log';

const schema_doc = new mongoose.Schema<DocLog>(
    {
        docId: { type: String, required: true },
        fullTitle: { type: String, required: true },
        revision: { type: Number, required: true },
        delta: { type: Number, default: 0 },
        userEmail: { type: String, required: true },
        userName: { type: String, required: true },
        comment: { type: String, default: '' },
        action: { type: String, required: true },
        systemLog: { type: String, default: '' },
        time: { type: Date, default: new Date() },
    },
    {
        timestamps: true,
    },
);

const schema_user = new mongoose.Schema<UserLog>(
    {
        userEmail: { type: String, required: true },
        action: { type: String, required: true },
        systemLog: { type: String, default: '' },
        time: { type: Date, default: new Date() },
    },
    {
        timestamps: true,
    },
);

const schema_penalty = new mongoose.Schema<PenaltyLog>(
    {
        userEmail: { type: String, required: true },
        penaltyType: { type: String, required: true },
        action: { type: String, required: true },
        penalizedEmail: { type: String, required: true },
        duration: { type: Number, required: true },
        comment: { type: String, default: '' },
        time: { type: Date, default: new Date() },
    },
    {
        timestamps: true,
    },
);

schema_doc.index({ createdAt: -1 });
schema_user.index({ createdAt: -1 });
schema_penalty.index({ createdAt: -1 });

export const DocLogModel = mongoose.model('Doc-Log', schema_doc);
export const UserLogModel = mongoose.model('User-Log', schema_user);
export const PenaltyLogModel = mongoose.model('Penalty-Log', schema_penalty);
