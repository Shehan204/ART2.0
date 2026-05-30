import * as THREE from 'three';
import { ARObject } from '../types';

export class ObjectFactory {
  public static createMesh(obj: ARObject): THREE.Group {
    const group = new THREE.Group();
    group.userData = { arObject: obj };
    
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
      // scale up geometry slightly so it's easier to see from a distance
      geom.scale(10, 10, 10);
      return geom;
    };

    switch (obj.type) {
      case 'cube':
      case 'sphere':
      case 'cylinder':
      default:
        geometry = createSGeometry();
        break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    group.scale.set(obj.scale, obj.scale, obj.scale);
    group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);

    return group;
  }

  public static updateMesh(group: THREE.Group, obj: ARObject): void {
    group.scale.set(obj.scale, obj.scale, obj.scale);
    group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    group.userData = { arObject: obj };

    group.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.color.set(obj.color || '#ffffff');
      }
    });
  }
}
