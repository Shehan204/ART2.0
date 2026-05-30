import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARObject } from '../types';

export class ObjectFactory {
  public static createMesh(obj: ARObject): THREE.Group {
    const group = new THREE.Group();
    group.userData = { arObject: obj };
    
    // We start with a fallback geometry while loading
    const fallbackGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const fallbackMat = new THREE.MeshStandardMaterial({ color: obj.color || '#ffffff', wireframe: true });
    const placeholder = new THREE.Mesh(fallbackGeom, fallbackMat);
    group.add(placeholder);

    // Attempt to load the custom 3D model from public/models/
    const loader = new GLTFLoader();
    const modelUrl = `/models/${obj.type}.glb`;

    loader.load(
      modelUrl,
      (gltf) => {
        group.remove(placeholder); // Remove fallback once loaded
        
        const model = gltf.scene;
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            // Optionally tint the model using the selected color
            if (mesh.material instanceof THREE.MeshStandardMaterial && obj.color !== '#ffffff') {
              mesh.material.color.set(obj.color);
            }
          }
        });

        // Center the model perfectly
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center); 

        group.add(model);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load ${modelUrl}. Ensure the file exists in the public/models directory. Using fallback shape.`);
      }
    );

    group.scale.set(obj.scale, obj.scale, obj.scale);
    group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);

    return group;
  }

  public static updateMesh(group: THREE.Group, obj: ARObject): void {
    group.scale.set(obj.scale, obj.scale, obj.scale);
    group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    group.userData = { arObject: obj };
  }
}
