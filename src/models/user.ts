import mongoose from 'mongoose';
import type { User } from '../types/user';

const schema = new mongoose.Schema<User>(
    {
        email: { type: String, required: true, unique: true },
        name: { type: String, required: true, unique: true },
        group: { type: String, required: true },
        contribCnt: { type: Number, required: true },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model('User', schema);
