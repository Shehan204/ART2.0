import { db } from './firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ARObject } from '../types';

export class FirestoreService {
  private collectionName = 'objects';

  public subscribeToObjects(callback: (objects: ARObject[]) => void) {
    return onSnapshot(collection(db, this.collectionName), (snapshot) => {
      const objects: ARObject[] = [];
      snapshot.forEach((doc) => {
        objects.push({ id: doc.id, ...doc.data() } as ARObject);
      });
      callback(objects);
    }, (error) => {
      console.error("Firestore subscription error", error);
    });
  }

  public async saveObject(obj: ARObject): Promise<void> {
    try {
      await setDoc(doc(db, this.collectionName, obj.id), obj);
    } catch (error) {
      console.error("Error saving object", error);
      throw error;
    }
  }

  public async updateObject(id: string, updates: Partial<ARObject>): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, id), updates);
    } catch (error) {
      console.error("Error updating object", error);
      throw error;
    }
  }

  public async deleteObject(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
    } catch (error) {
      console.error("Error deleting object", error);
      throw error;
    }
  }
}

export const firestoreService = new FirestoreService();
