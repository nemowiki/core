import Translator from 'nemomark';

import TitleUtils from './title.js';
import GeneralUtils from './general.js';

export default class WikiTranslator {
    static categoryReg: RegExp;
    static fileReg: RegExp;
    static externalAnchorReg: RegExp;

    static initTranslator(): void {
        this.categoryReg = Translator.createRegExp(/\[#\[/, /(.+?)/, /]](?:\n)?/);
        this.fileReg = Translator.createRegExp(/\[@\[/, /(.+?)/, /]](?:\n)?/);
        this.externalAnchorReg = Translator.createRegExp(/\[(https)\[/, /(.+?)/, /\]\]/);
        Translator.parseAnchorAttributes = (link: string, name?: string) => {
            if (!name) name = link;
            let title = link;
            link = link.replaceAll(/(?<!\\)#/g, '<#>');
            return [title, link, name];
        };
    }

    static parseAnchorLink(content: string): string {
        content = content.replace(
            /(?<=<a title="(?:.(?!<\/a>))+?" href=")(.+?)(?=">.+?<\/a>)/g,
            captured => {
                const splittedHref = captured.split('<#>');
                if (splittedHref.length >= 2) {
                    const hash = splittedHref.splice(splittedHref.length - 1, 1)[0];
                    return (
                        '/r/' +
                        TitleUtils.encodeFullTitle(splittedHref.join('#')) +
                        '#' +
                        TitleUtils.encodeFullTitle(hash)
                    );
                } else {
                    return '/r/' + TitleUtils.encodeFullTitle(GeneralUtils.normalizeHtml(captured));
                }
            },
        );

        content = content.replace(
            /(?<=<a class="external-link" target="_blank" rel="noopener noreferrer" title="(?:.(?!<\/a>))+?" href=")(.+?)(?=">.+?<\/a>)/g,
            captured => {
                return GeneralUtils.normalizeHtml(captured);
            },
        );

        return content;
    }

    static toExternalAnchor(content: string): string {
        return content.replaceAll(this.externalAnchorReg, (_match, protocol, captured) => {
            let [parsedTitle, parsedLink, parsedName] = Translator.parseAnchorAttributes(
                captured.split(Translator.splitReg)[0].trim(),
                captured.split(Translator.splitReg).slice(1).join('|').trim(),
            );

            if (parsedName === parsedLink) {
                parsedName = `${protocol}:\\/\\/${parsedName}`;
            }

            return `<a class="external-link" target="_blank" rel="noopener noreferrer" title="${protocol}:\\/\\/${parsedTitle}" href="${protocol}:\\/\\/${parsedLink}">${parsedName}</a>`;
        });
    }

    static getAnchorFullTitleArr(content: string): string[] {
        const anchorFullTitleSet = new Set<string>();

        for (let match of content.matchAll(Translator.anchorReg)) {
            const fullTitleWithHashAndEscape = match[1].split(Translator.splitReg)[0].trim();

            const fullTitleWithHash = Translator.toUnescape(
                fullTitleWithHashAndEscape.replaceAll(/(?<!\\)#/g, '<#>'),
            );

            const splittedFullTitle = fullTitleWithHash.split('<#>');

            let fullTitle = fullTitleWithHash;
            if (splittedFullTitle.length >= 2) {
                fullTitle = splittedFullTitle.slice(0, splittedFullTitle.length - 1).join('#');
            }
            anchorFullTitleSet.add(fullTitle);
        }

        return Array.from(anchorFullTitleSet);
    }

    static getCategoryTitleArr(content: string): string[] {
        const categoryTitleSet = new Set<string>();
        for (let match of content.matchAll(this.categoryReg)) {
            match[1].split(Translator.splitReg).map(title => categoryTitleSet.add(title.trim()));
        }
        return Array.from(categoryTitleSet);
    }

    static toCategory(content: string): string {
        const categoryTitleArr = this.getCategoryTitleArr(content);
        content = content.replaceAll(this.categoryReg, '');

        if (categoryTitleArr.length === 0) {
            return '분류: <a title="분류:미분류" href="분류:미분류">미분류</a><hr/>' + content;
        } else {
            return (
                '분류: ' +
                categoryTitleArr
                    .map(title => {
                        return `<a title="분류:${title}" href="분류:${title}">${title}</a>`;
                    })
                    .join(' | ') +
                `<hr />${content}`
            );
        }
    }

    static getFileTitleArr(content: string): string[] {
        const fileTitleArr: string[] = [];
        for (let match of content.matchAll(this.fileReg)) {
            fileTitleArr.push(match[1].split(Translator.splitReg)[0].trim());
        }
        return fileTitleArr;
    }

    static toFile(content: string, filePathArr: Array<string | null>): string {
        let i = 0;
        content = content.replace(this.fileReg, (_match, captured) => {
            let [fileTitle, anchorTitle] = [
                captured.split(Translator.splitReg)[0].trim(),
                captured.split(Translator.splitReg).slice(1).join('|').trim(),
            ];
            if (anchorTitle === '') anchorTitle = '파일:' + fileTitle;

            const filePath = filePathArr[i++];
            if (!filePath) {
                return `<a title="${anchorTitle}" href="${anchorTitle}">파일:${fileTitle}</a>`;
            } else {
                return `<a title="${anchorTitle}" href="${anchorTitle}"><img src="${filePath}" alt="${fileTitle}"/></a>`;
            }
        });
        return content;
    }

    static toEscape(content: string): string {
        return Translator.toEscape(content);
    }

    static translate(
        content: string,
        fullTitle?: string,
        filePathArr?: Array<string | null>,
    ): string {
        content = content.replaceAll(/\r\n/g, '\n');

        content = Translator.preprocess(content, false);

        // If fullTitle is undefined, do not translate the wiki-kind grammar such as category.
        if (fullTitle) {
            content = this.toExternalAnchor(content);

            // Ignore Category for the root category.
            if (fullTitle !== '분류:분류') content = this.toCategory(content);

            if (filePathArr) content = this.toFile(content, filePathArr);
        }

        content = Translator.toInlines(content);
        content = Translator.toBlocks(content);

        content = Translator.postprocess(content);

        content = this.parseAnchorLink(content); // This must work after the category translation

        return content;
    }
}
