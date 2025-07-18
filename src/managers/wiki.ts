import type { Doc } from '../types/doc';
import type { Group } from '../types/authority';
import type { User } from '../types/user';
import type { DocAction } from '../types/log';
import type { WikiResponse } from '../types/general';

import mongoose from 'mongoose';
import HangulSearcher, { type SearchResult } from 'hangul-searcher';
import { type Change, diffWords } from 'diff';

import InfoController from '../controllers/info.js';
import MappingController from '../controllers/mapping.js';
import LogController from '../controllers/log.js';

import AuthorityManager from './authority.js';
import CategoryManager from './category.js';
import DocManager from './doc.js';
import LogManager from './log.js';
import FileManager from './file.js';
import DBManager from './db.js';
import StorageManager from './storage.js';

import WikiTranslator from '../utils/translator.js';
import TitleUtils from '../utils/title.js';

import UserModel from '../models/user.js';
import HistModel from '../models/hist.js';
import InfoModel from '../models/info.js';
import MappingModel from '../models/mapping.js';
import BacklinkModel from '../models/backlink.js';
import PenaltyModel from '../models/penalty.js';
import WikiMetaModel from '../models/wikiMeta.js';
import { UserLogModel, DocLogModel, PenaltyLogModel } from '../models/log.js';

export default class WikiManager {
    static async isInitialized(): Promise<boolean> {
        // WikiTranslator.overrideAnchorLinkParser();
        const categoryInfo = await InfoController.getInfoByFullTitle('분류:분류');
        return categoryInfo == null ? false : true;
    }

    static async init(): Promise<void> {
        const systemUser: User = AuthorityManager.getSystemUser();

        const uncategorizedDoc = DocManager.getEmptyDocByFullTitle('분류:미분류');
        uncategorizedDoc.authority['edit'] = ['manager', 'dev'];
        uncategorizedDoc.markup = '[#[분류]]';

        const categorizedDoc = DocManager.getEmptyDocByFullTitle('분류:분류');
        categorizedDoc.categorizedArr = [uncategorizedDoc.docId];
        categorizedDoc.authority['edit'] = ['manager', 'dev'];
        categorizedDoc.markup = '';

        await DocManager.createDocIgnoringCategory(uncategorizedDoc, systemUser);
        await DocManager.createDocIgnoringCategory(categorizedDoc, systemUser);
    }

    static async backup(): Promise<void> {
        console.log('[Backup] Starting backup...');
        const now = new Date();
        const dateStr = now.toISOString().replace(/T/, '_').replace(/:/g, '-').replace(/\..+/, ''); // YYYY-MM-DD_HH-MM-SS
        await this.#backupModel(UserModel, dateStr);
        await this.#backupModel(HistModel, dateStr);
        await this.#backupModel(InfoModel, dateStr);
        await this.#backupModel(MappingModel, dateStr);
        await this.#backupModel(BacklinkModel, dateStr);
        await this.#backupModel(PenaltyModel, dateStr);
        await this.#backupModel(WikiMetaModel, dateStr);
        await this.#backupModel(UserLogModel, dateStr);
        await this.#backupModel(DocLogModel, dateStr);
        await this.#backupModel(PenaltyLogModel, dateStr);
        console.log('[Backup] Backup complete');
    }

    static async #backupModel(DBModel: mongoose.Model<any>, dateStr: string) {
        try {
            console.log(`[Backup] ${DBModel.modelName}`);

            const fileKey = `${dateStr}/${DBModel.modelName}.json`;

            const data = await DBManager.getBackupFromModel(DBModel);
            await StorageManager.uploadBackupToStorage(fileKey, data);

            console.log(`[✓] Backup complete: ${fileKey}`);
        } catch (err) {
            console.error(`[!] Backup failed: ${DBModel.modelName}`, err);
        }
    }

    static async createHTMLByDoc(doc: Doc): Promise<string> {
        // Category Markup
        let categoryMarkup = '';

        if (doc.type === 'category') {
            categoryMarkup = await CategoryManager.createCategoryMarkupByCategorizedArr(
                doc.categorizedArr || [],
            );
        }

        // File Markup
        let fileMarkup = '';

        if (doc.type === 'file') {
            fileMarkup = `[@[${TitleUtils.getPrefixAndTitleByFullTitle(doc.fullTitle)[1]}]]\n\n`;
        }

        const fileTitleArr = WikiTranslator.getFileTitleArr(fileMarkup + doc.markup);
        const filePathArr = await FileManager.getFilePathsByTitleArr(fileTitleArr);

        // Combine
        return WikiTranslator.translate(
            fileMarkup + doc.markup + categoryMarkup,
            doc.fullTitle,
            filePathArr,
        );
    }

    static async readDocByFullTitle(
        fullTitle: string,
        user: User,
        revision = -1,
    ): Promise<WikiResponse<Doc>> {
        const doc = await DocManager.getDocByFullTitle(fullTitle, revision);
        if (!doc || (doc.state === 'deleted' && revision === -1))
            return {
                ok: false,
                reason: '존재하지 않는 문서입니다.',
            };
        else {
            const result = AuthorityManager.canRead(doc, user.group);
            if (!result.ok) return { ok: false, reason: result.reason };

            doc.html = await this.createHTMLByDoc(doc);
            return { ok: true, value: doc };
        }
    }

    // static async writeDocByDoc(doc: Doc, user: User, markup: string, comment?: string): Promise<void> {
    //     if (doc.state === 'deleted' || doc.state === 'new') {
    //         await this.#createDocByDoc(doc, markup, user, comment);
    //     } else if (doc.state === 'normal') {
    //         await this.#editDocByDoc(doc, markup, user, comment);
    //     }
    // }

    static async createDocByFullTitle(
        fullTitle: string,
        markup: string,
        user: User,
        comment?: string,
        file?: File,
    ): Promise<WikiResponse<void>> {
        const oldInfo = await InfoController.getInfoByFullTitle(fullTitle);

        const result = AuthorityManager.canCreate(oldInfo, fullTitle, user.group, file);

        if (!result.ok) return result;

        const newDoc = DocManager.getEmptyDocByFullTitle(fullTitle);

        if (oldInfo) {
            newDoc.authority = oldInfo.authority;
            newDoc.docId = oldInfo.docId;
            newDoc.revision = oldInfo.revision;
        }

        if (file) {
            const fileKey = await FileManager.uploadFileToStorage(file);
            newDoc.fileKey = fileKey;
        }

        newDoc.markup = CategoryManager.checkCategory(markup, newDoc.fullTitle);

        await CategoryManager.categorizeDoc(newDoc.docId, '', newDoc.markup);

        await DocManager.createDocIgnoringCategory(newDoc, user, comment);

        return { ok: true };
    }

    static async editDocByFullTitle(
        fullTitle: string,
        markup: string,
        user: User,
        comment?: string,
    ): Promise<WikiResponse<void>> {
        const prevDoc = await DocManager.getDocByFullTitle(fullTitle);
        if (!prevDoc) return { ok: false, reason: '존재하지 않는 문서입니다.' };

        const result = AuthorityManager.canEdit(prevDoc, user.group);
        if (!result.ok) return result;

        const nextDoc = { ...prevDoc };
        nextDoc.markup = CategoryManager.checkCategory(markup, prevDoc.fullTitle);
        nextDoc.revision += 1;

        await CategoryManager.categorizeDoc(prevDoc.docId, prevDoc.markup, nextDoc.markup);
        await LogManager.setDocLogByActionAndDoc('edit', prevDoc, nextDoc, user, comment);
        await DocManager.saveDocByDoc(prevDoc, nextDoc);

        return { ok: true };
    }

    static async deleteDocByFullTitle(
        fullTitle: string,
        user: User,
        comment?: string,
    ): Promise<WikiResponse<void>> {
        const prevDoc = await DocManager.getDocByFullTitle(fullTitle);
        if (!prevDoc) return { ok: false, reason: '존재하지 않는 문서입니다.' };

        const result = AuthorityManager.canDelete(prevDoc, user.group);
        if (!result.ok) return result;

        if (prevDoc.type === 'file') {
            await FileManager.deleteFileFromStorage(prevDoc.fileKey as string);
        }

        await CategoryManager.categorizeDoc(prevDoc.docId, prevDoc.markup, '');

        await DocManager.deleteDocIgnoringCategory(prevDoc, user, comment);

        return { ok: true };
    }

    static async moveDocByFullTitle(
        prevFullTitle: string,
        user: User,
        nextFullTitle: string,
        comment?: string,
    ): Promise<WikiResponse<void>> {
        const prevInfo = await InfoController.getInfoByFullTitle(prevFullTitle);
        if (!prevInfo) return { ok: false, reason: '존재하지 않는 문서입니다.' };

        const _nextInfo = await InfoController.getInfoByFullTitle(nextFullTitle);
        if (_nextInfo) return { ok: false, reason: `문서 "${nextFullTitle}"가 이미 존재합니다.` };

        const result = AuthorityManager.canMove(prevInfo, nextFullTitle, user.group);
        if (!result.ok) return result;

        const nextInfo = new InfoModel(prevInfo);
        nextInfo.fullTitle = nextFullTitle;

        await LogManager.setDocLogByActionAndInfo('move', prevInfo, nextInfo, user, comment);
        await LogController.updateFullTitlesOfAllDocLogsByDocId(nextInfo.docId, nextInfo.fullTitle);
        await InfoController.updateInfoByDoc(nextInfo);

        return { ok: true };
    }

    static async changeAuthorityByFullTitle(
        fullTitle: string,
        action: DocAction,
        groupArr: Group[],
        user: User,
        comment?: string,
    ): Promise<WikiResponse<void>> {
        const prevInfo = await InfoController.getInfoByFullTitle(fullTitle);
        if (!prevInfo) return { ok: false, reason: '존재하지 않는 문서입니다.' };

        const result = AuthorityManager.canChangeAuthority(prevInfo, groupArr, user.group);
        if (!result.ok) return result;

        const nextInfo = new InfoModel(prevInfo);
        nextInfo.authority = { ...prevInfo.authority, [action]: groupArr };

        await LogManager.setDocLogByActionAndInfo(
            'change_authority',
            prevInfo,
            nextInfo,
            user,
            comment,
        );
        await InfoController.updateInfoByDoc(nextInfo);

        return { ok: true };
    }

    static async hideDocByFullTitle(
        fullTitle: string,
        user: User,
        comment?: string,
    ): Promise<WikiResponse<void>> {
        const prevInfo = await InfoController.getInfoByFullTitle(fullTitle);
        if (!prevInfo) return { ok: false, reason: '존재하지 않는 문서입니다.' };

        const result = AuthorityManager.canHide(prevInfo, user.group);
        if (!result.ok) return result;

        const nextInfo = new InfoModel(prevInfo);
        nextInfo.state = 'hidden';

        await LogManager.setDocLogByActionAndInfo(
            'change_state',
            prevInfo,
            nextInfo,
            user,
            comment,
        );
        await InfoController.updateInfoByDoc(nextInfo);

        return { ok: true };
    }

    static async showDocByFullTitle(
        fullTitle: string,
        user: User,
        comment?: string,
    ): Promise<WikiResponse<void>> {
        const prevInfo = await InfoController.getInfoByFullTitle(fullTitle);
        if (!prevInfo) return { ok: false, reason: '존재하지 않는 문서입니다.' };

        const result = AuthorityManager.canShow(prevInfo, user.group);
        if (!result.ok) return result;

        const nextInfo = new InfoModel(prevInfo);
        nextInfo.state = 'deleted';

        await LogManager.setDocLogByActionAndInfo(
            'change_state',
            prevInfo,
            nextInfo,
            user,
            comment,
        );
        await InfoController.updateInfoByDoc(nextInfo);

        return { ok: true };
    }

    static async uploadFileByFullTitle(
        fullTitle: string,
        markup: string,
        file: File,
        user: User,
        comment?: string,
    ): Promise<WikiResponse<void>> {
        const result = AuthorityManager.canUploadFile(fullTitle, file);
        if (!result.ok) return result;

        return await this.createDocByFullTitle(fullTitle, markup, user, comment, file);
    }

    static async compareDocByDocs(oldDoc: Doc | null, newDoc: Doc | null): Promise<Change[]> {
        return diffWords(oldDoc?.markup || '', newDoc?.markup || '');
    }

    static async searchDoc(
        searchWord: string,
    ): Promise<{ status: 'exact' | 'searched'; result: Array<string | SearchResult> }> {
        const fullTitleArr = await MappingController.getAllFullTitles();
        const hangulSearcher = new HangulSearcher(fullTitleArr);
        const searchResultArr = hangulSearcher.search(searchWord);
        if (searchResultArr.length !== 0 && searchResultArr[0] === searchWord) {
            // Exact match
            return {
                status: 'exact',
                result: [searchWord],
            };
        } else {
            return {
                status: 'searched',
                result: searchResultArr,
            };
        }
    }
}
