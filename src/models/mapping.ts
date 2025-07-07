import mongoose from 'mongoose';
import type { Mapping } from '../types/mapping';

const schema = new mongoose.Schema<Mapping>(
    {
        docId: { type: String, required: true, unique: true },
        fullTitle: { type: String, required: true, unique: true },
        docState: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model('Mapping', schema);
