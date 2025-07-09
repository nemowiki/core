import { getChoseong } from 'es-hangul';
import GeneralUtils from './general.js';
import WikiTranslator from './translator.js';
import TitleUtils from './title.js';

export default class MarkupUtils {
    static createChoseongMapByTitleArr(titleArr: string[]): Map<string, string[]> {
        // choseong -> titleArr
        titleArr.sort();
        const choseongMap = new Map<string, string[]>();

        titleArr.forEach(title => {
            const firstChar = title.toUpperCase().charAt(0);
            let choseong = getChoseong(firstChar);
            if (choseong === '') {
                choseong = firstChar;
            }
            if (!GeneralUtils.choseongArr.includes(choseong)) {
                choseong = '기타';
            }
            GeneralUtils.addItemToArrInMap(choseongMap, choseong, title);
        });

        for (let [choseong, _value] of choseongMap) {
            (choseongMap.get(choseong) || []).sort();
        }

        return choseongMap;
    }

    static createMarkupByChoseongMap(choseongMap: Map<string, string[]>, prefix: string): string {
        // '\n:' + '(categorized)*keys' + ':'
        let middlePart = '';
        const choseongArr = Array.from(choseongMap.keys());
        choseongArr.sort();
        GeneralUtils.moveItemToLastInArr(choseongArr, '기타');
        choseongArr.forEach(choseong => {
            const parsedTitleArr: string[] = (choseongMap.get(choseong) || []).map(title =>
                WikiTranslator.toEscape(title),
            );
            middlePart += `(${choseong}\n:([[ `;

            if (prefix === '') {
                middlePart += parsedTitleArr.join(' ]])\n([[ ');
            } else {
                middlePart += parsedTitleArr
                    .map(title => {
                        return `${prefix}:${title}|${title}`;
                    })
                    .join(' ]])\n([[ ');
            }

            middlePart += ' ]]):)';
        });

        return '\n:' + middlePart + ':';
    }

    static createAlignedMarkupByFullTitleArr(
        fullTitleArr: string[],
        beforeStr: string = '',
    ): string {
        let markup = '';

        // prefix -> titleArr
        const prefixMap = TitleUtils.createPrefixMapByFullTitleArr(fullTitleArr);
        const prefixArr = Array.from(prefixMap.keys()).sort();
        GeneralUtils.moveItemToFirstInArr(prefixArr, '분류');

        prefixArr.forEach((prefix, i) => {
            if (!beforeStr) markup += `\n${prefix} 문서`;
            else markup += `\n${beforeStr} ${prefix} 문서`;

            const titleArr = prefixMap.get(prefix) || [];

            if (prefix === '일반') prefix = '';

            if (titleArr.length === 0) return;

            const choseongMap = MarkupUtils.createChoseongMapByTitleArr(titleArr);

            markup += MarkupUtils.createMarkupByChoseongMap(choseongMap, prefix);

            if (i + 1 < prefixArr.length) {
                markup += '\n----\n';
            }
        });

        return markup;
    }
}
