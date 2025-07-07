import mongoose from 'mongoose';
import type { Hist } from '../types/hist';

const schema = new mongoose.Schema<Hist>(
    {
        docId: { type: String, required: true },
        revision: { type: Number, required: true },
        markup: { type: String, default: '' },
    },
    {
        timestamps: true,
    },
);

schema.index({ docId: 1, revision: -1 });

export default mongoose.model('Hist', schema);
