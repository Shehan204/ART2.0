import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ARObject } from '../types';

export class ObjectFactory {
  public static createMesh(obj: ARObject): THREE.Group {
    const group = new THREE.Group();
    group.userData = { arObject: obj };
    
    group.scale.set(obj.scale, obj.scale, obj.scale);
    group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);

    if (obj.type === 'model' && obj.modelUrl) {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(dracoLoader);

      let finalUrl = obj.modelUrl;
      if (finalUrl.includes('firebasestorage.googleapis.com')) {
        finalUrl = 'https://corsproxy.io/?' + encodeURIComponent(finalUrl);
      }

      loader.load(
        finalUrl,
        (gltf) => {
          const model = gltf.scene;
          
          // Optionally center and scale the model automatically
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3()).length();
          const targetSize = 1.0; // 1 meter approx
          if (size > 0) {
            const scale = targetSize / size;
            model.scale.setScalar(scale);
          }
          
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
          group.add(model);
        },
        undefined,
        (error) => {
          console.error("An error happened loading GLTF", error);
          // Fallback box to make sure SOMETHING renders if the model fails
          const fallbackGeom = new THREE.BoxGeometry(1, 1, 1);
          const edges = new THREE.EdgesGeometry(fallbackGeom);
          const fallbackMat = new THREE.LineBasicMaterial({ color: '#00A3FF', linewidth: 3 });
          const fallbackMesh = new THREE.LineSegments(edges, fallbackMat);
          group.add(fallbackMesh);
        }
      );
      return group;
    }

    let geometry: THREE.BufferGeometry;
    const material = new THREE.MeshStandardMaterial({ 
      color: obj.color || '#ffffff',
      roughness: 0.7,
      metalness: 0.3
    });

    const createSGeometry = () => {
      const shape = new THREE.Shape();
      shape.moveTo(0.04, 0.05);
      shape.lineTo(-0.04, 0.05);
      shape.lineTo(-0.04, 0.01);
      shape.lineTo(0.02, 0.01);
      shape.lineTo(0.02, -0.01);
      shape.lineTo(-0.04, -0.01);
      shape.lineTo(-0.04, -0.05);
      shape.lineTo(0.04, -0.05);
      shape.lineTo(0.04, -0.01);
      shape.lineTo(-0.02, -0.01);
      shape.lineTo(-0.02, 0.01);
      shape.lineTo(0.04, 0.01);
      shape.lineTo(0.04, 0.05);
      const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
      geom.center();
      geom.scale(10, 10, 10);
      return geom;
    };

    switch (obj.type) {
      case 'cube':
         geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
         break;
      case 'sphere':
         geometry = new THREE.SphereGeometry(0.3, 32, 32);
         break;
      case 'cylinder':
         geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 32);
         break;
      default:
        geometry = createSGeometry();
        break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    return group;
  }

  public static updateMesh(group: THREE.Group, obj: ARObject): void {
    group.scale.set(obj.scale, obj.scale, obj.scale);
    group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    group.userData = { arObject: obj };

    if (obj.type !== 'model') {
      group.children.forEach(child => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material instanceof THREE.MeshStandardMaterial) {
          ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(obj.color || '#ffffff');
        }
      });
    }
  }
}
