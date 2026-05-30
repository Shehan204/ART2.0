export interface ARObject {
  id: string;
  type: 'cube' | 'sphere' | 'cylinder' | 'model' | 'text';
  latitude: number;
  longitude: number;
  altitude: number;
  scale: number;
  rotation: { x: number; y: number; z: number };
  color: string;
  createdBy?: string;
  createdAt: number;
}

export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}

export interface UserData {
  id?: string;
  username: string;
  score: number;
  role: 'admin' | 'user';
  createdAt: number;
}
