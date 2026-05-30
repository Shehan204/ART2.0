import { db } from './firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, updateDoc, runTransaction, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { ARObject, UserData } from '../types';

export class FirestoreService {
  private collectionName = 'objects';
  private usersCollection = 'users';

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

  // User & Game Methods
  public async getUser(userId: string): Promise<UserData | null> {
    const docSnap = await getDoc(doc(db, this.usersCollection, userId));
    return docSnap.exists() ? docSnap.data() as UserData : null;
  }

  public async createUser(userId: string, username: string): Promise<void> {
    const userData: UserData = {
      username,
      score: 0,
      role: 'user',
      createdAt: Date.now()
    };
    await setDoc(doc(db, this.usersCollection, userId), userData);
  }

  public async collectObject(userId: string, objectId: string, points: number): Promise<boolean> {
    try {
      await runTransaction(db, async (transaction) => {
        const objRef = doc(db, this.collectionName, objectId);
        const userRef = doc(db, this.usersCollection, userId);
        
        const objDoc = await transaction.get(objRef);
        if (!objDoc.exists()) {
          throw new Error("Object already collected or does not exist!");
        }

        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User does not exist!");
        }

        const currentScore = userDoc.data().score || 0;
        
        // Delete object and increment user score atomically
        transaction.delete(objRef);
        transaction.update(userRef, { score: currentScore + points });
      });
      return true;
    } catch (e) {
      console.error("Transaction failed: ", e);
      return false;
    }
  }

  public subscribeToLeaderboard(callback: (users: UserData[]) => void) {
    const q = query(collection(db, this.usersCollection), orderBy("score", "desc"), limit(50));
    return onSnapshot(q, (snapshot) => {
      const users: UserData[] = [];
      snapshot.forEach((doc) => {
         users.push({ id: doc.id, ...doc.data() } as any);
      });
      callback(users);
    });
  }
}

export const firestoreService = new FirestoreService();
