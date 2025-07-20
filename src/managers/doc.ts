import type { Info } from '../types/info';
import type { CategoryDoc, Doc, DocId, FileDoc } from '../types/doc';
import type { Hist } from '../types/hist';
import type { User } from '../types/user';

import InfoController from '../controllers/info.js';
import HistController from '../controllers/hist.js';
import MetaController from '../controllers/meta.js';

import BacklinkManager from './backlink.js';
import LogManager from './log.js';
import AuthorityManager from './authority.js';

import TitleUtils from '../utils/title.js';
import CryptoUtils from '../utils/crypto.js';

export default class DocManager {
    static createDocByInfoAndHist(info: Info, hist: Hist): Doc {
        return {
            docId: info.docId,
            type: info.type,
            fullTitle: info.fullTitle,
            authority: info.authority,
            state: info.state,
            categorizedArr: info.categorizedArr,
            fileKey: info.fileKey,
            revision: hist.revision, // Use hist's revision to manage old version of docs.
            markup: hist.markup,
        };
    }

    static async getDocByFullTitle(fullTitle: string, revision = -1): Promise<Doc | null> {
        const info = await InfoController.getInfoByFullTitle(fullTitle);
        if (info === null) {
            return null;
        } else {
            const hist = await HistController.getHistByDocId(info.docId, revision);
            if (hist === null) {
                return null;
            } else {
                const doc = this.createDocByInfoAndHist(info, hist);
                if (doc.state === 'hidden') doc.markup = '';
                return doc;
            }
        }
    }

    static getEmptyDocByFullTitle(fullTitle: string): Doc {
        const docType = TitleUtils.getDocTypeByFullTitle(fullTitle);
        if (docType === 'general') {
            return this.#getEmptyGeneralDocByFullTitle(fullTitle);
        } else if (docType === 'wiki') {
            return this.#getEmptyWikiDocByFullTitle(fullTitle);
        } else if (docType === 'category') {
            return this.#getEmptyCategoryDocByFullTitle(fullTitle);
        } else if (docType === 'file') {
            return this.#getEmptyFileDocByFullTitle(fullTitle);
        } else if (docType === 'template') {
            return this.#getEmptyTemplateDocByFullTitle(fullTitle);
        } else {
            throw new Error('존재하지 않는 문서 타입입니다.');
        }
    }

    static #getEmptyGeneralDocByFullTitle(fullTitle: string): Doc {
        const docId = CryptoUtils.createNewId() as DocId;
        return {
            docId,
            type: 'general',
            fullTitle,
            authority: AuthorityManager.getDefaultAuthorityByDocType('general'),
            state: 'new',
            revision: 0,
            markup: '',
        };
    }

    static #getEmptyWikiDocByFullTitle(fullTitle: string): Doc {
        const docId = CryptoUtils.createNewId() as DocId;
        return {
            docId,
            type: 'wiki',
            fullTitle,
            authority: AuthorityManager.getDefaultAuthorityByDocType('wiki'),
            state: 'new',
            revision: 0,
            markup: '',
        };
    }

    static #getEmptyFileDocByFullTitle(fullTitle: string): FileDoc {
        const docId = CryptoUtils.createNewId() as DocId;
        return {
            docId,
            type: 'file',
            fullTitle,
            authority: AuthorityManager.getDefaultAuthorityByDocType('file'),
            state: 'new',
            filePath: '',
            revision: 0,
            markup: '[분류[파일]]\n:[**출처**][출처를 입력해 주세요.]\n[**라이선스**][라이선스를 입력해 주세요.]\n[**설명**][파일에 대해 간단한 설명을 입력해 주세요.]:',
        };
    }

    static #getEmptyCategoryDocByFullTitle(fullTitle: string): CategoryDoc {
        const docId = CryptoUtils.createNewId() as DocId;
        return {
            docId,
            type: 'category',
            fullTitle,
            authority: AuthorityManager.getDefaultAuthorityByDocType('category'),
            state: 'new',
            categorizedArr: [],
            revision: 0,
            markup: '[분류[미분류]]',
        };
    }

    static #getEmptyTemplateDocByFullTitle(fullTitle: string): Doc {
        const docId = CryptoUtils.createNewId() as DocId;
        return {
            docId,
            type: 'template',
            fullTitle,
            authority: AuthorityManager.getDefaultAuthorityByDocType('template'),
            state: 'new',
            revision: 0,
            markup: '[분류[틀]]',
        };
    }

    static async saveDocByDoc(prevDoc: Doc | null, nextDoc: Doc): Promise<void> {
        await BacklinkManager.updatelinksByDocs(prevDoc, nextDoc);
        await InfoController.updateInfoByDoc(nextDoc);
        await HistController.setHistByDoc(nextDoc);
    }

    static async createDocIgnoringCategory(
        newDoc: Doc,
        user: User,
        comment?: string,
    ): Promise<void> {
        newDoc.state = 'normal';
        newDoc.revision += 1;
        await MetaController.addDocCnt(1);
        await LogManager.setDocLogByActionAndDoc('create', null, newDoc, user, comment);
        await DocManager.saveDocByDoc(null, newDoc);
    }

    static async deleteDocIgnoringCategory(
        prevDoc: Doc,
        user: User,
        comment?: string,
    ): Promise<void> {
        const nextDoc = { ...prevDoc };
        nextDoc.state = 'deleted';
        nextDoc.markup = '';
        nextDoc.revision += 1;

        await MetaController.addDocCnt(-1);
        await LogManager.setDocLogByActionAndDoc('delete', prevDoc, nextDoc, user, comment);
        await DocManager.saveDocByDoc(prevDoc, nextDoc);
    }
}
