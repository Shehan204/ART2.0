import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  public async uploadModel(file: File): Promise<string> {
    const filename = `${uuidv4()}_${file.name}`;
    const storageRef = ref(storage, `models/${filename}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  }
}

export const storageService = new StorageService();
