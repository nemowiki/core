import type { DocType } from '../types/doc';

import GeneralUtils from './general.js';

export default class TitleUtils {
    static encodeFullTitle(fullTitle: string): string {
        if (fullTitle.search(/^ *\.* *$/) === -1) {
            return encodeURIComponent(fullTitle.trim());
        } else {
            return '';
        }
    }

    static decodeFullTitle(fullTitle: string): string {
        return decodeURIComponent(fullTitle).trim();
    }

    static prefixArr = ['일반', '분류', '위키', '파일', '틀'];
    static getPrefixAndTitleByFullTitle(fullTitle: string): [string, string] {
        let prefix = '일반';
        let title = fullTitle;

        const temp = fullTitle.split(':');
        if (this.prefixArr.includes(temp[0])) {
            prefix = temp[0];
            title = temp.slice(1).join(':');
        }

        return [prefix, title];
    }

    static getDocTypeByFullTitle(fullTitle: string): DocType {
        const [prefix, _title] = this.getPrefixAndTitleByFullTitle(fullTitle);
        if (prefix === '분류') {
            return 'category';
        } else if (prefix === '위키') {
            return 'wiki';
        } else if (prefix === '파일') {
            return 'file';
        } else if (prefix === '틀') {
            return 'template';
        } else {
            return 'general';
        }
    }

    static setPrefixToTitle(title: string, prefix: string): string {
        return `${prefix}:${title}`;
    }

    static setPrefixToTitleArr(titleArr: string[], prefix: string): string[] {
        return titleArr.map(title => this.setPrefixToTitle(title, prefix));
    }

    static createPrefixMapByFullTitleArr(fullTitleArr: string[]): Map<string, string[]> {
        const prefixMap = new Map<string, string[]>();

        fullTitleArr.forEach(fullTitle => {
            const [prefix, title] = this.getPrefixAndTitleByFullTitle(fullTitle);
            GeneralUtils.addItemToArrInMap<string, string>(prefixMap, prefix, title);
        });

        return prefixMap;
    }
}
