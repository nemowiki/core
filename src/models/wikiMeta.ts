import mongoose from 'mongoose';
import type { WikiMeta } from '../types/meta';

const schema = new mongoose.Schema<WikiMeta>(
    {
        _id: { type: String, default: 'global' },
        userCnt: { type: Number, default: 0 },
        docCnt: { type: Number, default: 0 },
        contribCnt: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model('WikiMeta', schema);
