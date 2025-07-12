import type { Info } from './types/info';
import type { Doc } from './types/doc';
import type { User, UserEmail, UserName } from './types/user';
import type { DocAction, DocLog, DocLogDoc } from './types/log';
import type { Group } from './types/authority';
import type { PenaltyDoc, PenaltyId } from './types/penalty';
import type { WikiResponse } from './types/general';

import type { Change } from 'diff';
import type { SearchResult } from 'hangul-searcher';

// import xss from 'xss';
import mongoose from 'mongoose';

import DBManager from './managers/db.js';
import WikiManager from './managers/wiki.js';
import AuthorityManager from './managers/authority.js';
import DocManager from './managers/doc.js';
import BacklinkManager from './managers/backlink.js';
import PenaltyManager from './managers/penalty.js';
import UserManager from './managers/user.js';
import LogManager from './managers/log.js';
import StorageManager from './managers/storage.js';

import LogController from './controllers/log.js';
import UserController from './controllers/user.js';
import MetaController from './controllers/meta.js';
import MappingController from './controllers/mapping.js';
import InfoController from './controllers/info.js';

import WikiTranslator from './utils/translator.js';
import GeneralUtils from './utils/general.js';

// ================ Initialization ================
export async function activateWiki(
    MONGO_URI: string,
    AWS_BUCKET_NAME: string,
    AWS_ID: string,
    AWS_SECRET: string,
): Promise<boolean> {
    WikiTranslator.initTranslator();
    await DBManager.init(MONGO_URI);
    await StorageManager.init(AWS_BUCKET_NAME, AWS_ID, AWS_SECRET);
    if (!(await WikiManager.isInitialized())) {
        await mongoose.connection.transaction(async () => {
            await MetaController.initMeta();

            const systemUser = AuthorityManager.getSystemUser();
            const res = await UserManager.signupUserByEmailAndName(
                systemUser.email,
                systemUser.name,
            );

            if (!res.ok) throw new Error(res.reason);

            const systemUserDoc = res.value;
            systemUserDoc.group = 'system';
            await systemUserDoc.save();

            await WikiManager.init();
        });
    }
    return true;
}

export async function backupWiki(): Promise<boolean> {
    await WikiManager.backup();
    return true;
}

// ================ User Utils ================

export async function getUserByEmail(email: string): Promise<User | null> {
    return await UserController.getUserByEmail(email as UserEmail);
}

export async function getUserByName(name: string): Promise<User | null> {
    return await UserController.getUserByName(name as UserName);
}

// ================ User Modules ================

export async function signinUserByEmail(email: string): Promise<WikiResponse<User | null>> {
    return await mongoose.connection.transaction(async () => {
        return await UserManager.signinUserByEmail(email as UserEmail);
    });
}

export async function signupUserByEmailAndName(
    email: string,
    name: string,
): Promise<WikiResponse<User>> {
    return await mongoose.connection.transaction(async () => {
        return await UserManager.signupUserByEmailAndName(email as UserEmail, name as UserName);
    });
}

export async function changeUserNameByName(
    userName: string,
    name: string,
    operator: User,
): Promise<WikiResponse<void>> {
    return await mongoose.connection.transaction(async () => {
        return await UserManager.changeNameByName(userName as UserName, name as UserName, operator);
    });
}

export async function changeUserGroupByName(
    userName: string,
    group: Group,
    operator: User,
): Promise<WikiResponse<void>> {
    return await mongoose.connection.transaction(async () => {
        return await UserManager.changeGroupByName(userName as UserName, group, operator);
    });
}

export async function removeUserByEmail(email: string): Promise<WikiResponse<void>> {
    return await mongoose.connection.transaction(async () => {
        return await UserManager.removeUserByEmail(email as UserEmail);
    });
}

export async function refreshAndGetPenaltiesByName(
    penalizedName: string,
): Promise<WikiResponse<PenaltyDoc[]>> {
    return await mongoose.connection.transaction(async () => {
        return await PenaltyManager.refreshPenaltiesByName(penalizedName as UserName);
    });
}

export async function warnUserByName(
    penalizedName: string,
    penalizer: User,
    duration: number,
    comment = '',
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment);
    return await mongoose.connection.transaction(async () => {
        return await PenaltyManager.warnUserByName(
            penalizedName as UserName,
            duration,
            comment,
            penalizer,
        );
    });
}

export async function blockUserByName(
    penalizedName: string,
    penalizer: User,
    duration: number,
    comment = '',
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment);
    return await mongoose.connection.transaction(async () => {
        return await PenaltyManager.blockUserByName(
            penalizedName as UserName,
            duration,
            comment,
            penalizer,
        );
    });
}

export async function removePenaltyById(
    penaltyId: PenaltyId,
    comment: string,
    penalizer: User,
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment);
    return await mongoose.connection.transaction(async () => {
        return await PenaltyManager.removePenaltyById(penaltyId, comment, penalizer);
    });
}

// ================ Doc Utils ================
export function getEmptyDocByFullTitle(fullTitle: string): Doc {
    return DocManager.getEmptyDocByFullTitle(fullTitle);
}

export async function getInfoByFullTitle(fullTitle: string): Promise<Info | null> {
    return await InfoController.getInfoByFullTitle(fullTitle);
}

export async function getDocByFullTitle(fullTitle: string, revision = -1): Promise<Doc | null> {
    return await DocManager.getDocByFullTitle(fullTitle, revision);
}

// ================ Doc Modules ================
export async function readDocByFullTitle(
    fullTitle: string,
    user: User,
    revision = -1,
): Promise<WikiResponse<Doc>> {
    return await WikiManager.readDocByFullTitle(fullTitle, user, revision);
}

export async function createDocByFullTitle(
    fullTitle: string,
    user: User,
    markup: string,
    comment?: string,
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment || '');
    return await mongoose.connection.transaction(async () => {
        return await WikiManager.createDocByFullTitle(fullTitle, markup, user, comment);
    });
}

export async function editDocByFullTitle(
    fullTitle: string,
    user: User,
    markup: string,
    comment?: string,
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment || '');
    return await mongoose.connection.transaction(async () => {
        return await WikiManager.editDocByFullTitle(fullTitle, markup, user, comment);
    });
}

export async function deleteDocByFullTitle(
    fullTitle: string,
    user: User,
    comment?: string,
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment || '');
    return await mongoose.connection.transaction(async () => {
        return await WikiManager.deleteDocByFullTitle(fullTitle, user, comment);
    });
}

export async function moveDocByFullTitle(
    fullTitle: string,
    user: User,
    newFullTitle: string,
    comment?: string,
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment || '');
    return await mongoose.connection.transaction(async () => {
        return await WikiManager.moveDocByFullTitle(fullTitle, user, newFullTitle, comment);
    });
}

export async function changeAuthorityByFullTitle(
    fullTitle: string,
    action: DocAction,
    groupArr: Group[],
    user: User,
    comment?: string,
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment || '');
    return await mongoose.connection.transaction(async () => {
        return await WikiManager.changeAuthorityByFullTitle(
            fullTitle,
            action,
            groupArr,
            user,
            comment,
        );
    });
}

export async function hideDocByFullTitle(
    fullTitle: string,
    user: User,
    comment?: string,
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment || '');
    return await mongoose.connection.transaction(async () => {
        return await WikiManager.hideDocByFullTitle(fullTitle, user, comment);
    });
}

export async function showDocByFullTitle(
    fullTitle: string,
    user: User,
    comment?: string,
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment || '');
    return await mongoose.connection.transaction(async () => {
        return await WikiManager.showDocByFullTitle(fullTitle, user, comment);
    });
}

export async function compareDocByDoc(
    oldDoc: Doc | null,
    newDoc: Doc | null,
): Promise<WikiResponse<Change[]>> {
    return {
        ok: true,
        value: await WikiManager.compareDocByDocs(oldDoc, newDoc),
    };
}

export async function searchDoc(
    searchWord: string,
): Promise<WikiResponse<{ status: 'exact' | 'searched'; result: Array<string | SearchResult> }>> {
    return {
        ok: true,
        value: await WikiManager.searchDoc(searchWord),
    };
}

export async function previewDoc(doc: Doc): Promise<WikiResponse<string>> {
    return {
        ok: true,
        value: await WikiManager.createHTMLByDoc(doc),
    };
}

// ================ Log Utils ================
export async function getRecentWriteLogs(count: number = 10): Promise<Array<DocLog>> {
    return await LogController.getRecentWriteLogs(count);
}

// ================ Log Modules ================
export async function getDocLogsByFullTitle(
    fullTitle: string,
    page: number,
    cnt = 10,
): Promise<WikiResponse<DocLogDoc[]>> {
    return await LogManager.getDocLogsByFullTitle(fullTitle, page, cnt);
}

export async function getDocLogsByUserName(
    userName: string,
    page: number,
    cnt = 10,
): Promise<WikiResponse<DocLogDoc[]>> {
    return await LogManager.getDocLogsByUserName(userName as UserName, page, cnt);
}

// ================ File Module ================
export async function uploadFileByFullTitle(
    fullTitle: string,
    markup: string,
    file: File,
    user: User,
    comment?: string,
): Promise<WikiResponse<void>> {
    comment = GeneralUtils.ignoreHtml(comment || '');
    return await mongoose.connection.transaction(async () => {
        return await WikiManager.uploadFileByFullTitle(fullTitle, markup, file, user, comment);
    });
}

// ================ Other Utils ================

export async function getAllFullTitles(): Promise<string[]> {
    return await MappingController.getAllFullTitles();
}

export async function createBacklinkHtmlByFullTitle(fullTitle: string): Promise<string | null> {
    const markup = await BacklinkManager.createBacklinkMarkupByFullTitle(fullTitle);
    if (!markup) return null;
    return WikiTranslator.translate(markup);
}

// export function translateMarkup(markup: string, fullTitle: string): string {
//     markup = xss(markup.replaceAll(/\r\n/g, '\n'));
//     return WikiTranslator.translate(markup, fullTitle);
// }
