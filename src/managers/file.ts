import StorageManager from './storage.js';
import TitleUtils from '../utils/title.js';
import InfoController from '../controllers/info.js';

export default class FileManager {
    static async uploadFileToStorage(file: File): Promise<string> {
        return await StorageManager.uploadImageToStorage(file);
    }

    static async deleteFileFromStorage(key: string): Promise<void> {
        await StorageManager.deleteImageFromStorage(key);
    }

    static async getFilePathsByTitleArr(titleArr: string[]): Promise<Array<string | null>> {
        const fullTitleArr = TitleUtils.setPrefixToTitleArr(titleArr, '파일');
        const fileInfoArr = await InfoController.getInfosByFullTitleArr(fullTitleArr);
        const filePathArr = fileInfoArr.map(fileInfo => {
            if (fileInfo?.state === 'normal')
                return StorageManager.getFilePathFromKey(fileInfo?.fileKey as string);
            return null;
        });
        return filePathArr;
    }
}
