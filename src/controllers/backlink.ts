import type { BacklinkDoc, Backlink } from '../types/backlink';

import BacklinkModel from '../models/backlink.js';

export default class BacklinkController {
    static async getBacklinkByFullTitle(fullTitle: string): Promise<BacklinkDoc | null> {
        return await BacklinkModel.findOne({
            fullTitle,
        });
    }

    static isEmptyBacklink(backlink: Backlink): boolean {
        return (
            backlink.linkedFromArr.length === 0 &&
            backlink.redirectedFromArr.length === 0 &&
            backlink.embeddedInArr.length === 0
        );
    }

    static async linkFromFormerToLatter(
        linkingFullTitle: string,
        linkedFullTitle: string,
    ): Promise<void> {
        await BacklinkModel.findOneAndUpdate(
            { fullTitle: linkedFullTitle },
            { $addToSet: { linkedFromArr: linkingFullTitle } },
            { new: true, upsert: true },
        );
    }

    static async unlinkFromFormerToLatter(
        unlinkingFullTitle: string,
        unlinkedFullTitle: string,
    ): Promise<void> {
        const updatedBacklink: BacklinkDoc = await BacklinkModel.findOneAndUpdate(
            { fullTitle: unlinkedFullTitle },
            { $pull: { linkedFromArr: unlinkingFullTitle } },
            { new: true, upsert: true },
        );
        if (this.isEmptyBacklink(updatedBacklink)) {
            await BacklinkModel.deleteOne({ fullTitle: unlinkedFullTitle });
        }
    }

    static async embedFromFormerToLatter(
        embeddingFullTitle: string,
        embeddedFullTitle: string,
    ): Promise<void> {
        await BacklinkModel.findOneAndUpdate(
            { fullTitle: embeddedFullTitle },
            { $addToSet: { embeddedInArr: embeddingFullTitle } },
            { new: true, upsert: true },
        );
    }

    static async unembedFromFormerToLatter(
        unembeddingFullTitle: string,
        unembeddedFullTitle: string,
    ): Promise<void> {
        const updatedBacklink: BacklinkDoc = await BacklinkModel.findOneAndUpdate(
            { fullTitle: unembeddedFullTitle },
            { $pull: { embeddedInArr: unembeddingFullTitle } },
            { new: true, upsert: true },
        );
        if (this.isEmptyBacklink(updatedBacklink)) {
            await BacklinkModel.deleteOne({ fullTitle: unembeddedFullTitle });
        }
    }

    static async redirectFromFormerToLatter(
        redirectingFullTitle: string,
        redirectedFullTitle: string,
    ): Promise<void> {
        await BacklinkModel.findOneAndUpdate(
            { fullTitle: redirectedFullTitle },
            { $addToSet: { redirectedFromArr: redirectingFullTitle } },
            { new: true, upsert: true },
        );
    }

    static async unredirectFromFormerToLatter(
        unredirectingFullTitle: string,
        unredirectedFullTitle: string,
    ): Promise<void> {
        const updatedBacklink: BacklinkDoc = await BacklinkModel.findOneAndUpdate(
            { fullTitle: unredirectedFullTitle },
            { $pull: { redirectedFromArr: unredirectingFullTitle } },
            { new: true, upsert: true },
        );
        if (this.isEmptyBacklink(updatedBacklink)) {
            await BacklinkModel.deleteOne({ fullTitle: unredirectedFullTitle });
        }
    }
}
