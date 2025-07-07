import mongoose from 'mongoose';
import type { Penalty } from '../types/penalty';

const schema = new mongoose.Schema<Penalty>(
    {
        penalizedEmail: { type: String, required: true },
        penalizerEmail: { type: String, required: true },
        type: { type: String, required: true },
        until: { type: Date, required: true },
        duration: { type: Number, required: true },
        comment: { type: String, default: '' },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model('Penalty', schema);
