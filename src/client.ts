import AuthorityManager from './managers/authority.js';
import TitleUtils from './utils/title.js';

export const canRead = AuthorityManager.canRead;
export const canCreate = AuthorityManager.canCreate;
export const canEdit = AuthorityManager.canEdit;
export const canDelete = AuthorityManager.canDelete;
export const canMove = AuthorityManager.canMove;
export const canChangeAuthority = AuthorityManager.canChangeAuthority;
export const canHide = AuthorityManager.canHide;
export const canShow = AuthorityManager.canShow;
export const canUploadFile = AuthorityManager.canUploadFile;
export const canApplyPenalty = AuthorityManager.canApplyPenalty;
export const canRemovePenalty = AuthorityManager.canRemovePenalty;
export const canChangeName = AuthorityManager.canChangeName;
export const canChangeGroup = AuthorityManager.canChangeGroup;

export const encodeFullTitle = TitleUtils.encodeFullTitle;
export const decodeFullTitle = TitleUtils.decodeFullTitle;
