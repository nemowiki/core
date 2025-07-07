import type { DocAction } from './log';
import type { UserName } from './user';

export type Group =
    | 'none'
    | 'any'
    | 'guest'
    | 'user'
    | 'dev'
    | 'system'
    | 'manager'
    | 'blocked'
    | UserName;

export type Authority = Partial<Record<DocAction, Group[]>>;
