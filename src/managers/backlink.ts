import type { Doc } from '../types/doc';

import BacklinkController from '../controllers/backlink.js';

import GeneralUtils from '../utils/general.js';
import MarkupUtils from '../utils/markup.js';
import WikiTranslator from '../utils/translator.js';
import TitleUtils from '../utils/title.js';

export default class BacklinkManager {
    static async createBacklinkMarkupByFullTitle(fullTitle: string): Promise<string | null> {
        const backlink = await BacklinkController.getBacklinkByFullTitle(fullTitle);
        if (!backlink) return null;
        let content = '';
        content += MarkupUtils.createAlignedMarkupByFullTitleArr(
            backlink.linkedFromArr,
            '이 문서가 연결된',
        );
        content += MarkupUtils.createAlignedMarkupByFullTitleArr(
            backlink.embeddedInArr,
            '이 문서가 삽입된',
        );
        content += MarkupUtils.createAlignedMarkupByFullTitleArr(
            backlink.redirectedFromArr,
            '이 문서로 이동되는',
        );
        return content;
    }

    static async updatelinksByDocs(
        prevDoc: (Partial<Doc> & { markup: string }) | null,
        nextDoc: Partial<Doc> & { fullTitle: string; markup: string },
    ): Promise<void> {
        const linkingFullTitle = nextDoc.fullTitle;

        const prevLinkArr = WikiTranslator.getAnchorFullTitleArr(prevDoc?.markup || '');
        const nextLinkArr = WikiTranslator.getAnchorFullTitleArr(nextDoc.markup);

        const addedLinkArr = GeneralUtils.getDiffArr(prevLinkArr, nextLinkArr);
        const removedLinkArr = GeneralUtils.getDiffArr(nextLinkArr, prevLinkArr);

        // TODO: Improve it by using bulkwrite

        for (let fullTitle of addedLinkArr) {
            await BacklinkController.linkFromFormerToLatter(linkingFullTitle, fullTitle);
        }

        for (let fullTitle of removedLinkArr) {
            await BacklinkController.unlinkFromFormerToLatter(linkingFullTitle, fullTitle);
        }

        const prevEmbedArr = TitleUtils.setPrefixToTitleArr(
            WikiTranslator.getFileTitleArr(prevDoc?.markup || ''),
            '파일',
        );
        const nextEmbedArr = TitleUtils.setPrefixToTitleArr(
            WikiTranslator.getFileTitleArr(nextDoc.markup),
            '파일',
        );

        const addedEmbedArr = GeneralUtils.getDiffArr(prevEmbedArr, nextEmbedArr);
        const removedEmbedArr = GeneralUtils.getDiffArr(nextEmbedArr, prevEmbedArr);

        // TODO: Improve it by using bulkwrite

        for (let fullTitle of addedEmbedArr) {
            await BacklinkController.embedFromFormerToLatter(linkingFullTitle, fullTitle);
        }

        for (let fullTitle of removedEmbedArr) {
            await BacklinkController.unembedFromFormerToLatter(linkingFullTitle, fullTitle);
        }
    }
}
