import type { Info } from '../types/info';
import type { Group } from '../types/authority';
import type { User, UserEmail, UserName } from '../types/user';
import type { WikiResponse } from '../types/general';
import type { Authority } from '../types/authority';
import type { DocType } from '../types/doc';

import TitleUtils from '../utils/title.js';

export default class AuthorityManager {
    static isGroup(group: string): boolean {
        const groupArr: Group[] = ['none', 'any', 'guest', 'user', 'dev', 'manager', 'blocked'];
        return groupArr.includes(group as Group);
    }

    static getSystemUser(): User {
        return {
            email: '<SYSTEM>@<SYSTEM>' as UserEmail,
            name: '<SYSTEM>' as UserName,
            group: 'system',
            contribCnt: 0,
        };
    }

    static getDefaultAuthorityByDocType(docType: DocType): Authority {
        if (docType === 'general') {
            return {
                read: ['any'],
                create: ['any'],
                edit: ['any'],
                move: ['any'],
                delete: ['any'],
                change_authority: ['manager', 'dev'],
                change_state: ['manager', 'dev'],
            };
        } else if (docType === 'wiki') {
            return {
                read: ['any'],
                create: ['manager', 'dev'],
                edit: ['manager', 'dev'],
                move: ['manager', 'dev'],
                delete: ['manager', 'dev'],
                change_authority: ['manager', 'dev'],
                change_state: ['manager', 'dev'],
            };
        } else if (docType === 'file') {
            return {
                read: ['any'],
                create: ['none'],
                edit: ['any'],
                move: ['any'],
                delete: ['any'],
                change_authority: ['manager', 'dev'],
                change_state: ['manager', 'dev'],
            };
        } else if (docType === 'category') {
            return {
                read: ['any'],
                create: ['none'],
                edit: ['any'],
                move: ['none'],
                delete: ['none'],
                change_authority: ['manager', 'dev'],
                change_state: ['none'],
            };
        } else {
            throw new Error('Unexpected Doctype!');
        }
    }

    // static canCreateWiki(userGroup: Group): boolean {
    //     return ['system', 'manager', 'dev'].includes(userGroup);
    // }

    static isAuthorized(groupArr: Group[], group: Group): boolean {
        if (group === 'blocked' || group === 'guest') return false;
        if (group === 'system') return true;

        if (!groupArr) return false;

        if (groupArr.includes('any')) return true;
        if (groupArr.includes('none')) return false;

        if (groupArr.includes(group)) return true;
        else return false;
    }

    static canRead(docInfo: Info | null, userGroup: Group): WikiResponse<void> {
        if (!docInfo || docInfo.state === 'new')
            return { ok: false, reason: '존재하지 않는 문서입니다.' };
        // No deleted-state check. Because, even if the document is deleted, its authority, histories, or etc. should be readable.

        if (docInfo.state === 'hidden')
            return { ok: false, reason: '숨겨진 문서는 열람할 수 없습니다.' };

        // 차단된 사용자도 문서 열람은 가능
        if (userGroup === 'blocked' && (docInfo.authority['read'] || []).includes('any'))
            return { ok: true };

        // 게스트는 문서 열람'만' 가능
        if (userGroup === 'guest' && (docInfo.authority['read'] || []).includes('any'))
            return { ok: true };

        if (AuthorityManager.isAuthorized(docInfo.authority['read'] || [], userGroup))
            return { ok: true };

        return { ok: false, reason: '읽기 권한이 없습니다.' };
    }

    // static canWrite(doc: Doc|null, userGroup: Group): { ok: boolean, reason: string } {
    //     if (!doc || doc.state === 'deleted') {
    //         return this.#canCreate(doc, userGroup);
    //     } else {
    //         return this.#canEdit(doc, userGroup);
    //     }
    // }

    static canEdit(docInfo: Info | null, userGroup: Group): WikiResponse<void> {
        if (!docInfo || docInfo.state === 'new')
            return { ok: false, reason: '존재하지 않는 문서입니다.' };
        if (docInfo.state === 'hidden')
            return { ok: false, reason: '숨겨진 문서는 편집할 수 없습니다.' };
        if (docInfo.state === 'deleted')
            return { ok: false, reason: '삭제된 문서는 먼저 생성 후 편집할 수 있습니다.' };

        if (AuthorityManager.isAuthorized(docInfo.authority['edit'] || [], userGroup))
            return { ok: true };

        return { ok: false, reason: '편집 권한이 없습니다.' };
    }

    static canCreate(
        oldInfo: Info | null,
        fullTitle: string,
        userGroup: Group,
        file?: File,
    ): WikiResponse<void> {
        const [prefix, title] = TitleUtils.getPrefixAndTitleByFullTitle(fullTitle);

        if (prefix === '분류') return { ok: false, reason: '분류 문서는 생성할 수 없습니다.' };
        if (prefix === '파일' && !file)
            return { ok: false, reason: '파일 문서는 생성할 수 없습니다.' };

        if (title === '') return { ok: false, reason: '문서의 제목이 없습니다.' };

        let newDocAuthority = AuthorityManager.getDefaultAuthorityByDocType(
            TitleUtils.getDocTypeByFullTitle(fullTitle),
        );

        if (oldInfo) {
            if (oldInfo.state === 'deleted') {
                newDocAuthority = oldInfo.authority;
            } else if (oldInfo.state === 'hidden') {
                newDocAuthority = oldInfo.authority;
                return { ok: false, reason: '숨김 해제를 한 뒤에 생성할 수 있습니다.' };
            } else {
                return { ok: false, reason: '이미 존재하는 문서입니다.' };
            }
        }

        if (AuthorityManager.isAuthorized(newDocAuthority['create'] || [], userGroup))
            return { ok: true };

        if (file) return { ok: true };

        return { ok: false, reason: '생성 권한이 없습니다.' };
    }

    static canDelete(docInfo: Info | null, userGroup: Group): WikiResponse<void> {
        if (!docInfo || docInfo.state === 'new')
            return { ok: false, reason: '존재하지 않는 문서입니다.' };
        if (docInfo.state === 'hidden')
            return { ok: false, reason: '숨겨진 문서는 이미 삭제된 문서입니다.' };
        if (docInfo.state === 'deleted') return { ok: false, reason: '이미 삭제된 문서입니다.' };
        if (docInfo.type === 'category')
            return { ok: false, reason: '분류 문서는 삭제할 수 없습니다.' };

        if (AuthorityManager.isAuthorized(docInfo.authority['delete'] || [], userGroup))
            return { ok: true };

        return { ok: false, reason: '삭제 권한이 없습니다.' };
    }

    static canMove(
        prevInfo: Info | null,
        nextFullTitle: string,
        userGroup: Group,
    ): WikiResponse<void> {
        if (!prevInfo || prevInfo.state === 'new')
            return { ok: false, reason: '존재하지 않는 문서입니다.' };
        if (prevInfo.state === 'hidden')
            return { ok: false, reason: '숨겨진 문서는 이동할 수 없습니다.' };
        if (prevInfo.type === 'category')
            return { ok: false, reason: '분류 문서는 이동할 수 없습니다.' };

        if (!AuthorityManager.isAuthorized(prevInfo.authority['move'] || [], userGroup))
            return { ok: false, reason: '이동 권한이 없습니다.' };

        const [newPrefix, newTitle] = TitleUtils.getPrefixAndTitleByFullTitle(nextFullTitle);
        const [oldPrefix, _oldTitle] = TitleUtils.getPrefixAndTitleByFullTitle(prevInfo.fullTitle);

        if (newTitle === '') return { ok: false, reason: '새 문서의 제목이 없습니다.' };

        if (newPrefix !== oldPrefix)
            return { ok: false, reason: '문서의 접두어는 변경할 수 없습니다.' };

        return { ok: true };
    }

    static canChangeAuthority(
        docInfo: Info | null,
        groupArr: Group[],
        userGroup: Group,
    ): WikiResponse<void> {
        if (!docInfo || docInfo.state === 'new')
            return { ok: false, reason: '존재하지 않는 문서입니다.' };
        if (docInfo.state === 'hidden')
            return { ok: false, reason: '숨겨진 문서는 권한을 변경할 수 없습니다.' };

        if (!AuthorityManager.isAuthorized(docInfo.authority['change_authority'] || [], userGroup))
            return { ok: false, reason: '권한 변경 권한이 없습니다.' };

        for (let group of groupArr) {
            if (!this.isGroup(group))
                return { ok: false, reason: `${group} 그룹이 존재하지 않습니다.` };
        }

        return { ok: true };
    }

    static canHide(docInfo: Info | null, userGroup: Group): WikiResponse<void> {
        if (!docInfo || docInfo.state === 'new')
            return { ok: false, reason: '존재하지 않는 문서입니다.' };
        if (docInfo.state === 'hidden') return { ok: false, reason: '이미 숨겨진 문서입니다.' };

        if (docInfo.state === 'normal')
            return { ok: false, reason: '삭제된 문서만 숨길 수 있습니다.' };

        if (AuthorityManager.isAuthorized(docInfo.authority['change_state'] || [], userGroup))
            return { ok: true };

        return { ok: false, reason: '숨김 권한이 없습니다.' };
    }

    static canShow(docInfo: Info | null, userGroup: Group): WikiResponse<void> {
        if (!docInfo || docInfo.state === 'new')
            return { ok: false, reason: '존재하지 않는 문서입니다.' };
        if (docInfo.state !== 'hidden') return { ok: false, reason: '이미 숨겨진 문서입니다.' };

        if (AuthorityManager.isAuthorized(docInfo.authority['change_state'] || [], userGroup))
            return { ok: true };

        return { ok: false, reason: '숨김 해제 권한이 없습니다.' };
    }

    static canUploadFile(fullTitle: string, file: File): WikiResponse<void> {
        const [prefix, title] = TitleUtils.getPrefixAndTitleByFullTitle(fullTitle);
        if (prefix !== '파일')
            return { ok: false, reason: '파일 문서 제목의 접두어는 "파일"이어야 합니다.' };
        if (title === '') return { ok: false, reason: '파일 문서의 제목이 없습니다.' };
        if (file.size === 0) return { ok: false, reason: '파일의 크기가 0입니다.' };
        return { ok: true };
    }

    static canApplyPenalty(
        penalizedUser: User | null,
        duration: number,
        penalizerGroup: Group,
    ): WikiResponse<void> {
        if (!penalizedUser) return { ok: false, reason: '존재하지 않는 사용자입니다.' };

        if (duration < 0)
            return { ok: false, reason: '제재 기간은 0분 이상이어야 합니다. (0은 영구)' };

        if (!['manager', 'system', 'dev'].includes(penalizerGroup))
            return { ok: false, reason: '경고 및 차단 권한이 없습니다.' };

        if (['system', 'dev'].includes(penalizedUser.group))
            return { ok: false, reason: '시스템 및 개발자 그룹은 제재할 수 없습니다.' };

        return { ok: true };
    }

    static canRemovePenalty(penalizerGroup: Group): WikiResponse<void> {
        if (!['manager', 'system', 'dev'].includes(penalizerGroup))
            return { ok: false, reason: '경고 및 차단을 취소할 권한이 없습니다.' };
        return { ok: true };
    }

    static canChangeName(
        targetUser: User | null,
        operatorEmail: string,
        operatorGroup: Group,
    ): WikiResponse<void> {
        if (!targetUser) return { ok: false, reason: '존재하지 않는 사용자입니다.' };
        if (['blocked'].includes(operatorGroup))
            return { ok: false, reason: '차단된 사용자는 이름을 변경할 수 없습니다.' };
        if (['system'].includes(targetUser.group))
            return { ok: false, reason: '시스템 유저의 이름은 변경이 불가능합니다.' };
        if (targetUser.email !== operatorEmail)
            return { ok: false, reason: '이름 변경은 본인만 가능합니다.' };
        return { ok: true };
    }

    static canChangeGroup(targetUser: User | null, operatorGroup: Group): WikiResponse<void> {
        if (!targetUser) return { ok: false, reason: '존재하지 않는 사용자입니다.' };
        if (!['system', 'manager', 'dev'].includes(operatorGroup))
            return { ok: false, reason: '그룹 변경 권한이 없습니다.' };
        if (['system', 'dev'].includes(targetUser.group))
            return { ok: false, reason: '시스템 및 개발자 그룹은 그룹을 변경할 수 없습니다.' };
        return { ok: true };
    }
}
