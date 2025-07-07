import type { InfoDoc, Info } from '../types/info';
import type { Doc, DocId } from '../types/doc';

import InfoModel from '../models/info.js';

export default class InfoController {
    static async getInfoByFullTitle(fullTitle: string): Promise<InfoDoc | null> {
        return await InfoModel.findOne({
            fullTitle,
        });
    }

    static async getInfoByDocId(docId: DocId): Promise<InfoDoc | null> {
        return await InfoModel.findOne({
            docId,
        });
    }

    static async getInfosByDocIdArr(docIdArr: DocId[]): Promise<Array<InfoDoc | null>> {
        const infoArr = await InfoModel.find({
            docId: {
                $in: docIdArr,
            },
        });

        const infoMap = new Map<DocId, InfoDoc | null>();
        infoArr.forEach(info => {
            infoMap.set(info.docId, info);
        });

        return docIdArr.map(docId => {
            return infoMap.get(docId) || null;
        });
    }

    static async getInfosByFullTitleArr(fullTitleArr: string[]): Promise<Array<InfoDoc | null>> {
        const infoArr = await InfoModel.find({
            fullTitle: {
                $in: fullTitleArr,
            },
        });

        const infoMap = new Map<string, InfoDoc | null>();
        infoArr.forEach(info => {
            infoMap.set(info.fullTitle, info);
        });

        return fullTitleArr.map(fullTitle => {
            return infoMap.get(fullTitle) || null;
        });
    }

    static async updateInfoByDoc(doc: Partial<Doc> & Info): Promise<InfoDoc> {
        if (doc.type !== 'category') delete doc.categorizedArr;
        if (doc.type !== 'file') delete doc.fileKey;
        return await InfoModel.findOneAndUpdate({ docId: doc.docId }, doc, {
            new: true,
            upsert: true,
        });
    }
}
