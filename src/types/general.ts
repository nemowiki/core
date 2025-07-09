// import mongoose from 'mongoose';
// import type { Backlink } from './backlink';
// import type { Hist } from './hist';
// import type { Info } from './info';
// import type { DocLog, UserLog, PenaltyLog } from './log';
// import type { Mapping } from './mapping';
// import type { Penalty } from './penalty';
// import type { User } from './user';
// import type { WikiMeta } from './meta';

export type Branded<T, K> = T & { _brand: K };
export type WikiResponse<T> = T extends void
    ? { ok: true } | { ok: false; reason: string }
    : { ok: true; value: T } | { ok: false; reason: string };

// export type WikiModels =
//     mongoose.Model<Backlink>
//     | mongoose.Model<Hist>
//     | mongoose.Model<Info>
//     | mongoose.Model<DocLog>
//     | mongoose.Model<UserLog>
//     | mongoose.Model<PenaltyLog>
//     | mongoose.Model<Mapping>
//     | mongoose.Model<Penalty>
//     | mongoose.Model<User>
//     | mongoose.Model<WikiMeta>;
