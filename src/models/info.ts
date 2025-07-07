import mongoose from 'mongoose';
import type { Info, InfoDoc } from '../types/info';
import MappingModel from './mapping.js';

const schema = new mongoose.Schema<Info>(
    {
        docId: { type: String, unique: true, required: true },
        fullTitle: { type: String, unique: true, required: true },
        type: { type: String, required: true },
        state: { type: String, required: true },
        authority: { type: Object, required: true },
        revision: { type: Number, required: true },
        categorizedArr: { type: [String] },
        fileKey: { type: String },
    },
    {
        timestamps: true,
    },
);

schema.post('findOneAndUpdate', async function (doc) {
    const info = doc as InfoDoc;

    await MappingModel.findOneAndUpdate(
        {
            docId: info.docId,
        },
        {
            fullTitle: info.fullTitle,
            docState: info.state,
        },
        { upsert: true },
    );
});

export default mongoose.model('Info', schema);
