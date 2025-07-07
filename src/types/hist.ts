import type { HydratedDocument } from 'mongoose';
import type { DocId } from './doc';

export interface Hist {
    docId: DocId;
    revision: number;
    markup: string;
}

export type HistDoc = HydratedDocument<Hist>;
