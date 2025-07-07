import type { HydratedDocument } from 'mongoose';
import type { DocId, DocType, DocState } from './doc';
import type { Authority } from './authority';

export interface Info {
    docId: DocId;
    fullTitle: string;
    type: DocType;
    state: DocState;
    authority: Authority;
    revision: number;
    categorizedArr?: DocId[];
    fileKey?: string;
}

export type CategoryInfo = Info & {
    categorizedArr: DocId[];
};
export type FileInfo = Info & {
    fileKey: string;
};

export type InfoDoc = HydratedDocument<Info>;
