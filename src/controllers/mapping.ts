import type { DocId } from '../types/doc';

import MappingModel from '../models/mapping.js';

export default class MappingController {
    static async getDocIdByFullTitle(fullTitle: string): Promise<DocId | null> {
        const mapping = await MappingModel.findOne({ fullTitle, docState: 'normal' });
        return mapping?.docId || null;
    }

    static async getFullTitleByDocId(docId: DocId): Promise<string | null> {
        const mapping = await MappingModel.findOne({ docId, docState: 'normal' });
        return mapping?.fullTitle || null;
    }

    static async getAllFullTitles(): Promise<string[]> {
        const mappingArr = await MappingModel.find({ docState: 'normal' });
        return mappingArr.map(mapping => mapping.fullTitle);
    }
}
