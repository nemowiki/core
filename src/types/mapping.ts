import type { DocId, DocState } from './doc';

export interface Mapping {
    docId: DocId;
    fullTitle: string;
    docState: DocState;
}
