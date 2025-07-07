import type { HydratedDocument } from 'mongoose';

export interface WikiMeta {
    _id: 'global';
    docCnt: number;
    userCnt: number;
    contribCnt: number;
}

export type WikiMetaDoc = HydratedDocument<WikiMeta>;
