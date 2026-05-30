import { db } from './firebase';
import { collection, onSnapshot, setDoc, doc, getDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { ARObject, User } from '../types';

export class FirestoreService {
  private objectsCollection = 'objects';
  private usersCollection = 'users';

  public subscribeToObjects(callback: (objects: ARObject[]) => void) {
    return onSnapshot(collection(db, this.objectsCollection), (snapshot) => {
      const objects: ARObject[] = [];
      snapshot.forEach((doc) => {
        objects.push({ id: doc.id, ...doc.data() } as ARObject);
      });
      callback(objects);
    }, (error) => {
      console.error("Firestore subscription error", error);
    });
  }

  public subscribeToUsers(callback: (users: User[]) => void) {
    return onSnapshot(collection(db, this.usersCollection), (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as User);
      });
      users.sort((a, b) => b.points - a.points);
      callback(users);
    }, (error) => {
      console.error("Firestore user subscription error", error);
    });
  }

  public async saveObject(obj: ARObject): Promise<void> {
    try {
      await setDoc(doc(db, this.objectsCollection, obj.id), obj);
    } catch (error) {
      console.error("Error saving object", error);
      throw error;
    }
  }

  public async collectObject(objId: string, userId: string, pointsValue: number): Promise<void> {
    try {
       // Delete Object
       await deleteDoc(doc(db, this.objectsCollection, objId));
       // Add points to User
       await updateDoc(doc(db, this.usersCollection, userId), {
          points: increment(pointsValue)
       });
    } catch (error) {
      console.error("Error collecting object", error);
      throw error;
    }
  }

  public async saveUser(user: User): Promise<void> {
     try {
       await setDoc(doc(db, this.usersCollection, user.uid), user, { merge: true });
     } catch (e) {
       console.error(e);
     }
  }

  public async getUser(uid: string): Promise<User | null> {
      try {
        const d = await getDoc(doc(db, this.usersCollection, uid));
        if (d.exists()) return d.data() as User;
      } catch(e) {}
      return null;
  }

  public async updateObject(id: string, updates: Partial<ARObject>): Promise<void> {
    try {
      await updateDoc(doc(db, this.objectsCollection, id), updates);
    } catch (error) {
      console.error("Error updating object", error);
      throw error;
    }
  }

  public async deleteObject(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.objectsCollection, id));
    } catch (error) {
      console.error("Error deleting object", error);
      throw error;
    }
  }
}

export const firestoreService = new FirestoreService();
