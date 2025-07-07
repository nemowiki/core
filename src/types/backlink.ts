import type { HydratedDocument } from 'mongoose';

export interface Backlink {
    fullTitle: string;
    linkedFromArr: string[];
    redirectedFromArr: string[];
    embeddedInArr: string[];
}

export type BacklinkDoc = HydratedDocument<Backlink>;
