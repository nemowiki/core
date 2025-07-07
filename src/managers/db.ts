import mongoose from 'mongoose';

export default class DBManager {
    static async init(WIKI_MONGO_URI: string) {
        await mongoose.connect(WIKI_MONGO_URI);
        mongoose.set('transactionAsyncLocalStorage', true);
        mongoose.connection.on('error', e => {
            // TODO: Error handling
            throw new Error(e);
        });
    }

    static async getBackupFromModel(DBModel: mongoose.Model<any>) {
        const data = await DBModel.find().lean();
        return JSON.stringify(data);
    }
}
