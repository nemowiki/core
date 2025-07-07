import mongoose from 'mongoose';
// ================ Types ================
export type * from './types/authority.js';
export type * from './types/backlink.js';
export type * from './types/doc.js';
export type * from './types/hist.js';
export type * from './types/info.js';
export type * from './types/log.js';
export type * from './types/mapping.js';
export type * from './types/meta.js';
export type * from './types/penalty.js';
export type * from './types/user.js';
export type * from './types/general.js';
export type MongoDocId = mongoose.Types.ObjectId;
export type { SearchResult } from 'hangul-searcher';
export type { Change } from 'diff';
