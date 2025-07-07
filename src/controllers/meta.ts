import type { WikiMetaDoc } from '../types/meta';

import WikiMetaModel from '../models/wikiMeta.js';

export default class MetaController {
    static async initMeta(): Promise<void> {
        const exists = await WikiMetaModel.findOne({ _id: 'global' });
        if (!exists) {
            const metaDoc = new WikiMetaModel({
                _id: 'global',
                docCnt: 0,
                userCnt: 0,
                contribCnt: 0,
            });
            await metaDoc.save();
        }
    }

    static async getMeta(): Promise<WikiMetaDoc> {
        const meta = await WikiMetaModel.findOne({ _id: 'global' });
        if (meta == null) throw new Error('The WikiMetaModel must be initialized first!');
        return meta;
    }

    // static async addFullTitle(fullTitle: string): Promise<void> {
    //     await MetaModel.findOneAndUpdate({}, { $push: { fullTitleArr: fullTitle } });
    // }

    // static async removeFullTitle(fullTitle: string): Promise<void> {
    //     await MetaModel.findOneAndUpdate({}, { $pull: { fullTitleArr: fullTitle } });
    // }

    // static async updateFullTitle(prevFullTitle: string, newFullTitle: string): Promise<void> {
    //     await this.removeFullTitle(prevFullTitle);
    //     await this.addFullTitle(newFullTitle);
    // }

    static async addContribCnt(delta: number): Promise<void> {
        await WikiMetaModel.findOneAndUpdate({ _id: 'global' }, { $inc: { contribCnt: delta } });
    }

    static async addDocCnt(delta: number): Promise<void> {
        await WikiMetaModel.findOneAndUpdate({ _id: 'global' }, { $inc: { docCnt: delta } });
    }

    static async addUserCnt(delta: number): Promise<void> {
        await WikiMetaModel.findOneAndUpdate({ _id: 'global' }, { $inc: { userCnt: delta } });
    }
}
