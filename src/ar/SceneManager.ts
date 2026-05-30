import * as THREE from 'three';
import { ObjectFactory } from './ObjectFactory';
import { ARObject } from '../types';
import { gpsToLocal } from '../utils/gps';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private objectsGroup: THREE.Group;
  
  public originGPS: { lat: number; lng: number } | null = null;
  public currentARObjects: ARObject[] = [];

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 1000);
    
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    this.scene.add(light);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(0, 2, 0);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.objectsGroup = new THREE.Group();
    this.scene.add(this.objectsGroup);

    this.setupWindowResize();
  }

  private setupWindowResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  public render(timestamp: number, frame: XRFrame) {
    this.renderer.render(this.scene, this.camera);
  }

  public setOriginGPS(lat: number, lng: number) {
    this.originGPS = { lat, lng };
    this.syncObjects(this.currentARObjects); // Re-calculate local positions
  }

  public getCameraPosition(): THREE.Vector3 {
    if (this.renderer.xr.enabled && this.renderer.xr.isPresenting) {
      return this.renderer.xr.getCamera().position.clone();
    }
    return this.camera.position.clone();
  }
  
  public getCameraDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    if (this.renderer.xr.enabled && this.renderer.xr.isPresenting) {
      this.renderer.xr.getCamera().getWorldDirection(dir);
    } else {
      this.camera.getWorldDirection(dir);
    }
    return dir;
  }

  public syncObjects(objects: ARObject[]) {
    this.currentARObjects = objects;
    
    const newIds = objects.map(o => o.id);
    
    const toRemove = this.objectsGroup.children.filter(child => !newIds.includes(child.userData?.arObject?.id));
    toRemove.forEach(child => this.objectsGroup.remove(child));

    objects.forEach(obj => {
      let mesh = this.objectsGroup.children.find(c => c.userData?.arObject?.id === obj.id) as THREE.Group;
      if (mesh) {
        ObjectFactory.updateMesh(mesh, obj);
      } else {
        mesh = ObjectFactory.createMesh(obj);
        this.objectsGroup.add(mesh);
      }

      if (this.originGPS) {
        const localPos = gpsToLocal(obj.latitude, obj.longitude, this.originGPS.lat, this.originGPS.lng);
        mesh.position.set(localPos.x, obj.altitude, localPos.z);
      }
    });
  }

  public dispose() {
    this.renderer.dispose();
  }
}
