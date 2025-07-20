import type { CategoryInfo, Info, InfoDoc } from '../types/info';
import type { DocId } from '../types/doc';

import InfoController from '../controllers/info.js';
import HistController from '../controllers/hist.js';

import WikiTranslator from '../utils/translator.js';
import GeneralUtils from '../utils/general.js';
import TitleUtils from '../utils/title.js';
import MarkupUtils from '../utils/markup.js';

import DocManager from './doc.js';
import AuthorityManager from './authority.js';

export default class CategoryManager {
    static async createCategoryMarkupByCategorizedArr(categorizedArr: DocId[]): Promise<string> {
        const categorizedInfoArr = await InfoController.getInfosByDocIdArr(categorizedArr);

        if (categorizedInfoArr.includes(null)) throw new Error('Nonexistent doc is categorized!');

        const categorizedFullTitleArr = categorizedInfoArr.map(info => (info as Info).fullTitle);

        return MarkupUtils.createAlignedMarkupByFullTitleArr(categorizedFullTitleArr, '하위');
    }

    // static isCategorized(doc) {
    //     // The doc is categorized, including the Uncategorized-category.
    //     const categoryTitleArr = WikiTranslator.getCategoryTitleArr(doc.markup);
    //     return categoryTitleArr.length !== 0;
    // }

    // static isUncategorized(doc) {
    //     // The doc is literally categorized into the Uncategorized-category. It doesn't mean that the doc doesn't have any categories.
    //     const categoryTitleArr = WikiTranslator.getCategoryTitleArr(doc.markup);
    //     return categoryTitleArr.includes('미분류');
    // }

    static getAddCategoryTitleArr(prevMarkup: string | null, nextMarkup: string): string[] {
        if (prevMarkup === null) {
            return WikiTranslator.getCategoryTitleArr(nextMarkup);
        } else {
            return GeneralUtils.getDiffArr(
                WikiTranslator.getCategoryTitleArr(prevMarkup),
                WikiTranslator.getCategoryTitleArr(nextMarkup),
            );
        }
    }

    static getRemoveCategoryTitleArr(prevMarkup: string | null, nextMarkup: string): string[] {
        if (prevMarkup === null) {
            return [];
        } else {
            return GeneralUtils.getDiffArr(
                WikiTranslator.getCategoryTitleArr(nextMarkup),
                WikiTranslator.getCategoryTitleArr(prevMarkup),
            );
        }
    }

    static checkCategory(markup: string, fullTitle: string): string {
        const categoryTitleArr = WikiTranslator.getCategoryTitleArr(markup);

        if (categoryTitleArr.length === 0 && fullTitle !== '분류:분류') {
            markup = '[분류[미분류]]\n' + markup;
        } else if (categoryTitleArr.includes('미분류') && categoryTitleArr.length >= 2) {
            throw new Error(
                'A document cannot be categorized into both Uncategorized-category and others at the same time!',
            );
        } else if (fullTitle === '분류:분류') {
            throw new Error(
                'The categorized category cannot be categorized into other categories!',
            );
        }

        return markup;
    }

    static async categorizeDoc(
        docId: DocId,
        prevMarkup: string,
        nextMarkup: string,
    ): Promise<void> {
        const addCategoryFullTitleArr = TitleUtils.setPrefixToTitleArr(
            this.getAddCategoryTitleArr(prevMarkup, nextMarkup),
            '분류',
        );
        const removeCategoryFullTitleArr = TitleUtils.setPrefixToTitleArr(
            this.getRemoveCategoryTitleArr(prevMarkup, nextMarkup),
            '분류',
        );

        // console.log(`add: ${addCategoryFullTitleArr}`)
        // console.log(`remove: ${removeCategoryFullTitleArr}`)

        // Adding should be the first.
        await this.addDocToCategories(docId, addCategoryFullTitleArr);
        await this.removeDocFromCategories(docId, removeCategoryFullTitleArr);
    }

    static async addDocToCategories(docId: DocId, addCategoryFullTitleArr: string[]) {
        if (addCategoryFullTitleArr.length === 0) {
            // No categorise to add
            return true;
        } else {
            const addCategoryInfoArr =
                await InfoController.getInfosByFullTitleArr(addCategoryFullTitleArr);

            const addPromiseArr: Promise<InfoDoc | void>[] = [];
            const newCategoryIdArr: DocId[] = [];

            for (let idx = 0; idx < addCategoryInfoArr.length; idx++) {
                const categoryInfo = addCategoryInfoArr[idx];
                if (categoryInfo === null || categoryInfo.state === 'deleted') {
                    // new category
                    const fullTitle = addCategoryFullTitleArr[idx];
                    const prevDoc = await DocManager.getDocByFullTitle(fullTitle, -1);
                    const newDoc = DocManager.getEmptyDocByFullTitle(fullTitle);

                    if (prevDoc && prevDoc.state === 'deleted') {
                        newDoc.authority = prevDoc.authority;
                        newDoc.docId = prevDoc.docId;
                        newDoc.revision = prevDoc.revision;
                    }

                    if (!newDoc.categorizedArr)
                        throw new Error('The newDoc must be a category doc!');

                    newDoc.categorizedArr.push(docId);
                    newDoc.markup = '[분류[미분류]]';

                    newCategoryIdArr.push(newDoc.docId);
                    addPromiseArr.push(
                        DocManager.createDocIgnoringCategory(
                            newDoc,
                            AuthorityManager.getSystemUser(),
                        ),
                    );
                } else {
                    // existing category
                    if (!categoryInfo.categorizedArr)
                        throw new Error('The categoryInfo must be a category info!');
                    categoryInfo.categorizedArr.push(docId);
                    addPromiseArr.push(InfoController.updateInfoByDoc(categoryInfo));
                }
            }

            if (newCategoryIdArr.length !== 0) {
                // Add all new categories into the Uncategorized-category
                const uncategorizedInfo = (await InfoController.getInfoByFullTitle(
                    '분류:미분류',
                )) as CategoryInfo;
                if (uncategorizedInfo === null)
                    throw new Error('Uncategorized category must exist!');
                uncategorizedInfo.categorizedArr.push(...newCategoryIdArr);
                addPromiseArr.push(InfoController.updateInfoByDoc(uncategorizedInfo));
            }

            for (let promise of addPromiseArr) {
                await promise;
            }
        }
    }

    static async removeDocFromCategories(
        docId: DocId,
        removeCategoryFullTitleArr: string[],
    ): Promise<void> {
        if (removeCategoryFullTitleArr.length === 0) {
            // No categorise to remove.
        } else {
            const [removeInfoMap, deleteInfoArr] = await this.analyzeRemovingDocFromCategories(
                docId,
                removeCategoryFullTitleArr,
            );

            const removePromiseArr: Promise<InfoDoc>[] = [];
            for (let [key, _value] of removeInfoMap) {
                const removeInfo = removeInfoMap.get(key);
                removePromiseArr.push(InfoController.updateInfoByDoc(removeInfo as Info));
            }

            for (let info of deleteInfoArr) {
                const prevHist = await HistController.getHistByDocId(info.docId);
                if (!prevHist) throw new Error('Hist of existing category doc cannot be null!');
                const prevDoc = DocManager.createDocByInfoAndHist(info, prevHist);
                await DocManager.deleteDocIgnoringCategory(
                    prevDoc,
                    AuthorityManager.getSystemUser(),
                );
            }

            for (let promise of removePromiseArr) {
                await promise;
            }
        }
    }

    // RemoveInfoMap: Map<DocId, CategoryInfo> = CategoryInfo whose categorizedArr needs to be updated.
    // DeleteInfoArr: CategoryInfo[] = CategoryInfo which will be deleted.
    static async analyzeRemovingDocFromCategories(
        docId: DocId,
        categoryFullTitleArr: string[],
        removeInfoMap = new Map<string, CategoryInfo>(),
        deleteInfoArr: CategoryInfo[] = [],
    ): Promise<[Map<string, CategoryInfo>, CategoryInfo[]]> {
        for (let categoryFullTitle of categoryFullTitleArr) {
            [removeInfoMap, deleteInfoArr] = await this.analyzeRemovingDocFromCategory(
                docId,
                categoryFullTitle,
                removeInfoMap,
                deleteInfoArr,
            );
        }
        return [removeInfoMap, deleteInfoArr];
    }

    static async analyzeRemovingDocFromCategory(
        docId: DocId,
        categoryFullTitle: string,
        removeInfoMap: Map<string, CategoryInfo>,
        deleteInfoArr: CategoryInfo[],
    ): Promise<[Map<string, CategoryInfo>, CategoryInfo[]]> {
        let categoryInfo: CategoryInfo;
        if (!removeInfoMap.has(categoryFullTitle)) {
            const tempInfo = await InfoController.getInfoByFullTitle(categoryFullTitle);
            if (tempInfo === null) throw new Error('The category does not exist!');
            if (!tempInfo.categorizedArr) throw new Error('The tempInfo must be a category info!');
            categoryInfo = tempInfo as CategoryInfo;
            removeInfoMap.set(categoryFullTitle, categoryInfo);
        } else {
            categoryInfo = removeInfoMap.get(categoryFullTitle) as CategoryInfo;
        }

        if (
            categoryInfo.categorizedArr.length === 1 &&
            categoryInfo.fullTitle !== '분류:미분류' &&
            categoryInfo.fullTitle !== '분류:분류'
        ) {
            // This is the only doc categorized into the category.

            removeInfoMap.delete(categoryFullTitle);
            categoryInfo.categorizedArr = [];
            deleteInfoArr.push(categoryInfo);

            const categoryHist = await HistController.getHistByDocId(categoryInfo.docId);
            if (categoryHist === null) throw new Error('The category does not exist!');

            const categoryFullTitleArr = TitleUtils.setPrefixToTitleArr(
                WikiTranslator.getCategoryTitleArr(categoryHist.markup),
                '분류',
            );
            return await this.analyzeRemovingDocFromCategories(
                categoryInfo.docId,
                categoryFullTitleArr,
                removeInfoMap,
                deleteInfoArr,
            );
        } else {
            // It is not the only doc.
            categoryInfo.categorizedArr.splice(categoryInfo.categorizedArr.indexOf(docId), 1);
            return [removeInfoMap, deleteInfoArr];
        }
    }
}
