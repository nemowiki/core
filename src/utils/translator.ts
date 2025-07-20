import Translator from 'nemomark';

import TitleUtils from './title.js';
import GeneralUtils from './general.js';

export default class WikiTranslator {
    static categoryReg: RegExp;
    static fileReg: RegExp;
    static redirectReg: RegExp;
    static templateReg: RegExp;
    static externalAnchorReg: RegExp;
    static splitParamReg: RegExp;
    static paramReg: RegExp;

    static initTranslator(): void {
        this.categoryReg = Translator.createRegExp(/\[분류\[/, /(.+?)/, /]](?:\n)?/);
        this.fileReg = Translator.createRegExp(/\[파일\[/, /(.+?)/, /]](?:\n)?/);
        this.redirectReg = Translator.createRegExp(/\[넘겨주기\[/, /(.+?)/, /]](?:\n)?/);
        this.templateReg = Translator.createRegExp(/\[틀\[/, /(.+?)/, /]](?:\n)?/);
        this.externalAnchorReg = Translator.createRegExp(/\[(https)\[/, /(.+?)/, /\]\]/);
        this.splitParamReg = Translator.createRegExp(/=/);
        this.paramReg = Translator.createRegExp(/@@/, /(.+?)/, /@@/);
        Translator.parseAnchorAttributes = (link: string, name?: string) => {
            if (!name) name = link;
            let title = link;
            link = link.replaceAll(/(?<!\\)#/g, '<#>');
            return [title, link, name];
        };
    }

    static getTitleAndParamsMap(captured: string): [string, Map<string, string>] {
        let [title, params] = [
            captured.split(Translator.splitReg)[0].trim(),
            captured.split(Translator.splitReg).slice(1),
        ];

        const paramsMap: Map<string, string> = new Map();
        params.forEach((param: string) => {
            const [key, value] = [
                param.split(this.splitParamReg)[0].trim(),
                param.split(this.splitParamReg).slice(1).join('=').trim(),
            ];
            if (key && !paramsMap.has(key)) paramsMap.set(key, value);
        });

        return [title, paramsMap];
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

    static toCategory(content: string, fullTitle: string): string {
        const categoryTitleArr = this.getCategoryTitleArr(content);
        content = content.replaceAll(this.categoryReg, '');

        if (TitleUtils.getPrefixAndTitleByFullTitle(fullTitle)[0] === '분류') {
            content = '\n' + content;
        }

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

            const [fileTitle, fileParamsMap] = this.getTitleAndParamsMap(captured);
            const anchorTitle = fileParamsMap.get('a') || '파일:' + fileTitle;
            const imgStyle = !Number(fileParamsMap.get('s'))
                ? ''
                : `style="width: ${fileParamsMap.get('s')}rem"`;

            const filePath = filePathArr[i++];
            if (!filePath) {
                return `<a title="${anchorTitle}" href="${anchorTitle}">파일:${fileTitle}</a>`;
            } else {
                return `<a title="${anchorTitle}" href="${anchorTitle}"><img src="${filePath}" alt="${fileTitle}" ${imgStyle}/></a>`;
            }
        });
        return content;
    }

    static getTemplateTitleArr(content: string): string[] {
        const templateTitleArr: string[] = [];
        for (let match of content.matchAll(this.templateReg)) {
            templateTitleArr.push(match[1].split(Translator.splitReg)[0].trim());
        }
        return templateTitleArr;
    }

    static toTemplate(content: string, templateMarkupArr: Array<string | null>): string {
        let i = 0;
        content = content.replace(this.templateReg, (_match, captured) => {
            const [templateTitle, templateParamsMap] = this.getTitleAndParamsMap(captured);
            let templateMarkup = templateMarkupArr[i++];

            if (!templateMarkup) {
                return `[[틀:${templateTitle}]]`;
            } else {
                templateMarkup = templateMarkup.replaceAll(this.categoryReg, '');
                templateMarkup = templateMarkup.replaceAll(this.templateReg, '');
                templateMarkup = templateMarkup.replaceAll(this.redirectReg, '');

                const defaultValueMap: Map<string, string> = new Map();
                templateMarkup = templateMarkup.replace(this.paramReg, (_match, paramKeyAndDefault) => {
                    const paramKey = paramKeyAndDefault.split(this.splitParamReg)[0].trim();
                    let paramValue = templateParamsMap.get(paramKey);

                    if (paramValue) return paramValue;
                    else {
                        if (defaultValueMap.has(paramKey)) return defaultValueMap.get(paramKey);
                        else {
                            const defaultValue = paramKeyAndDefault.split(this.splitParamReg).slice(1).join('=').trim();
                            defaultValueMap.set(paramKey, defaultValue);
                            return defaultValue;
                        }
                    }
                });
                return templateMarkup + '\n';
            }
        });
        return content;
    }

    static getRedirectFullTitleArr(content: string): string[] {
        const redirectFullTitleArr: string[] = [];
        for (let match of content.matchAll(this.redirectReg)) {
            redirectFullTitleArr.push(match[1]);
            break; // Only one redirect is allowed
        }
        return redirectFullTitleArr;
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

        content = Translator.toInlines(content);
        content = Translator.toBlocks(content);

        // If fullTitle is undefined, do not translate the wiki-kind grammar such as category.
        if (fullTitle) {
            content = this.toExternalAnchor(content);

            if (filePathArr) content = this.toFile(content, filePathArr);

            // Ignore Category for the root category.
            if (fullTitle !== '분류:분류') content = this.toCategory(content, fullTitle);

        }

        content = Translator.postprocess(content);

        content = this.parseAnchorLink(content); // This must work after the category translation

        return content;
    }
}
