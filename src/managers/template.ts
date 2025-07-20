import type { User } from '../types/user';

import AuthorityManager from './authority.js';
import DocManager from "./doc.js";
import TitleUtils from "../utils/title.js";

export default class TemplateManager {
    static async getTemplateMarkupByTitleArr(titleArr: string[], user: User): Promise<Array<string | null>> {
        const fullTitleArr = TitleUtils.setPrefixToTitleArr(titleArr, '틀');
        const docArr = await Promise.all(fullTitleArr.map(fullTitle => DocManager.getDocByFullTitle(fullTitle)));
        return docArr.map(doc => {
            if (doc && AuthorityManager.canRead(doc, user.group).ok) return doc.markup;
            return null;
        });
    }
}