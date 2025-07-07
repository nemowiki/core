import mongoose from 'mongoose';
import type { Backlink } from '../types/backlink';

const schema = new mongoose.Schema<Backlink>(
    {
        fullTitle: { type: String, unique: true, required: true },
        linkedFromArr: { type: [String], default: [] },
        redirectedFromArr: { type: [String], default: [] },
        embeddedInArr: { type: [String], default: [] },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model('Backlink', schema);
