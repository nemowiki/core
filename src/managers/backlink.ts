import type { Doc } from '../types/doc';

import BacklinkController from '../controllers/backlink.js';

import GeneralUtils from '../utils/general.js';
import MarkupUtils from '../utils/markup.js';
import WikiTranslator from '../utils/translator.js';
import TitleUtils from '../utils/title.js';

export default class BacklinkManager {
    static async createBacklinkHtmlByFullTitle(fullTitle: string): Promise<string | null> {
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

        content = WikiTranslator.translate(content);
        content = content.replaceAll(
            /(?<=<a title="(?:.(?!<\/a>))+?" href=")(.+?)(?=">.+?<\/a>)/g,
            '$1?redirect=no',
        );

        return content;
    }

    static async updatelinksByDocs(
        prevDoc: (Partial<Doc> & { markup: string }) | null,
        nextDoc: Partial<Doc> & { fullTitle: string; markup: string },
    ): Promise<void> {
        const linkingFullTitle = nextDoc.fullTitle;

        // Link

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

        // Embed

        const prevEmbedArr = [
            ...TitleUtils.setPrefixToTitleArr(
                WikiTranslator.getFileTitleArr(prevDoc?.markup || ''),
                '파일',
            ),
            ...TitleUtils.setPrefixToTitleArr(
                WikiTranslator.getTemplateTitleArr(prevDoc?.markup || ''),
                '틀',
            ),
        ];

        const nextEmbedArr = [
            ...TitleUtils.setPrefixToTitleArr(
                WikiTranslator.getFileTitleArr(nextDoc.markup),
                '파일',
            ),
            ...TitleUtils.setPrefixToTitleArr(
                WikiTranslator.getTemplateTitleArr(nextDoc.markup),
                '틀',
            ),
        ];

        const addedEmbedArr = GeneralUtils.getDiffArr(prevEmbedArr, nextEmbedArr);
        const removedEmbedArr = GeneralUtils.getDiffArr(nextEmbedArr, prevEmbedArr);

        // TODO: Improve it by using bulkwrite

        for (let fullTitle of addedEmbedArr) {
            await BacklinkController.embedFromFormerToLatter(linkingFullTitle, fullTitle);
        }

        for (let fullTitle of removedEmbedArr) {
            await BacklinkController.unembedFromFormerToLatter(linkingFullTitle, fullTitle);
        }

        // Redirect

        const prevRedirectArr = WikiTranslator.getRedirectFullTitleArr(prevDoc?.markup || '');
        const nextRedirectArr = WikiTranslator.getRedirectFullTitleArr(nextDoc.markup);

        const addedRedirectArr = GeneralUtils.getDiffArr(prevRedirectArr, nextRedirectArr);
        const removedRedirectArr = GeneralUtils.getDiffArr(nextRedirectArr, prevRedirectArr);

        // TODO: Improve it by using bulkwrite

        for (let fullTitle of addedRedirectArr) {
            await BacklinkController.redirectFromFormerToLatter(linkingFullTitle, fullTitle);
        }

        for (let fullTitle of removedRedirectArr) {
            await BacklinkController.unredirectFromFormerToLatter(linkingFullTitle, fullTitle);
        }
    }
}
