import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { SceneManager } from '../ar/SceneManager';
import { firestoreService } from '../firebase/firestoreService';
import { ARObject } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { haversineDistance } from '../utils/gps';

export interface ARCanvasRef {
  placeObject: (type: ARObject['type'], color: string) => void;
  deleteLookedAtObject: () => void;
}

interface ARCanvasProps {
  isAdmin: boolean;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  onReady?: () => void;
}

export const ARCanvas = forwardRef<ARCanvasRef, ARCanvasProps>(({ isAdmin, onSessionStart, onSessionEnd, onReady }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [objects, setObjects] = useState<ARObject[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  
  useEffect(() => {
    // Watch GPS Position
    if (navigator.geolocation && navigator.geolocation.watchPosition) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.warn("GPS tracking error", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      console.warn("Geolocation not supported by this environment");
    }
  }, []);

  const callbacksRef = useRef({ isAdmin, onSessionStart, onSessionEnd, onReady });
  useEffect(() => {
    callbacksRef.current = { isAdmin, onSessionStart, onSessionEnd, onReady };
  }, [isAdmin, onSessionStart, onSessionEnd, onReady]);

  useEffect(() => {
    if (!containerRef.current || !buttonContainerRef.current) return;
    
    sceneManagerRef.current = new SceneManager(containerRef.current);
    const sceneManager = sceneManagerRef.current;
    
    // Simple AR button, no hit test or local floor required
    const button = ARButton.createButton(sceneManager.renderer, { 
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body }
    });
    
    button.style.position = 'absolute';
    button.style.bottom = '20px';
    button.style.padding = '12px 24px';
    button.style.border = '1px solid #00F0FF';
    button.style.borderRadius = '2px';
    button.style.background = '#0A0B0E';
    button.style.color = '#00F0FF';
    button.style.fontFamily = 'monospace';
    button.style.fontSize = '12px';
    button.style.fontWeight = 'bold';
    button.style.textTransform = 'uppercase';
    button.style.letterSpacing = '0.1em';
    button.style.outline = 'none';
    button.style.zIndex = '999';
    button.style.cursor = 'pointer';
    button.style.left = '50%';
    button.style.transform = 'translateX(-50%)';
    buttonContainerRef.current.appendChild(button);
    
    const renderLoop = (timestamp: number, frame: XRFrame) => {
      sceneManager.render(timestamp, frame);
    };

    if (sceneManager.renderer.xr.enabled) {
      sceneManager.renderer.setAnimationLoop(renderLoop);
    }
    
    // Tap to select/delete
    const onSelect = () => {
      if (!callbacksRef.current.isAdmin) return;
      import('three').then((THREE) => {
        const controller = sceneManager.renderer.xr.getController(0);
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        const raycaster = new THREE.Raycaster();
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        const intersects = raycaster.intersectObjects(sceneManager.scene.children, true);
        if (intersects.length > 0) {
          const findGroup = (obj: THREE.Object3D): THREE.Group | null => {
            if (obj.userData?.arObject) return obj as THREE.Group;
            if (obj.parent) return findGroup(obj.parent);
            return null;
          };
          
          for (let i = 0; i < intersects.length; i++) {
             const group = findGroup(intersects[i].object);
             if (group && group.uuid) {
                 firestoreService.deleteObject(group.uuid).catch(console.error);
                 return;
             }
          }
        }
      });
    };

    const controller = sceneManager.renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    sceneManager.scene.add(controller);
    
    if (callbacksRef.current.onReady) callbacksRef.current.onReady();
    
    sceneManager.renderer.xr.addEventListener('sessionstart', () => {
      if (buttonContainerRef.current) buttonContainerRef.current.style.display = 'none';
      if (callbacksRef.current.onSessionStart) callbacksRef.current.onSessionStart();
      
      // If we start the session and already have GPS, lock it in as origin immediately
      // Actually we handled this in the sync effect below but this is a good anchor point.
    });
    sceneManager.renderer.xr.addEventListener('sessionend', () => {
      if (buttonContainerRef.current) buttonContainerRef.current.style.display = 'block';
      if (callbacksRef.current.onSessionEnd) callbacksRef.current.onSessionEnd();
      
      // Reset origin when ending session
      if (sceneManagerRef.current) {
         sceneManagerRef.current.originGPS = null;
      }
    });

    const unsubscribe = firestoreService.subscribeToObjects((fetched) => setObjects(fetched));

    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
      }
      if (button.parentElement) button.parentElement.removeChild(button);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    
    // First time we get GPS and we are in an active session (or about to be), set it as origin
    if (!sceneManagerRef.current.originGPS && currentLocation) {
      sceneManagerRef.current.setOriginGPS(currentLocation.lat, currentLocation.lng);
    }
    
    let filteredObjects = objects;
    if (currentLocation) {
        // Filter within 200m
        filteredObjects = objects.filter(o => 
            haversineDistance(currentLocation, {lat: o.latitude, lng: o.longitude}) <= 200
        );
    }
    
    sceneManagerRef.current.syncObjects(filteredObjects);
  }, [objects, currentLocation]);

  useImperativeHandle(ref, () => ({
    placeObject: async (type: ARObject['type'], color: string) => {
      let loc = currentLocation;
      
      if (!loc) {
        // Fallback to fetch immediately or use mock if failed
        try {
          loc = await new Promise<{lat: number, lng: number}>((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error("No geolocation"));
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => reject(err),
              { enableHighAccuracy: true, timeout: 5000 }
            );
          });
          setCurrentLocation(loc);
        } catch (error) {
          console.warn("Could not get GPS. Using (0, 0) as fallback.", error);
          loc = { lat: 0, lng: 0 }; // Fallback location for testing
          setCurrentLocation(loc);
        }
      }
      
      const newObj: ARObject = {
        id: uuidv4(),
        type,
        latitude: loc.lat,
        longitude: loc.lng,
        altitude: -0.5, // slightly below camera height by default
        scale: 1,
        rotation: { x: 0, y: 0, z: 0 },
        color,
        createdAt: Date.now()
      };
      
      try {
        await firestoreService.saveObject(newObj);
      } catch (e) {
        console.error("Failed to save object", e);
      }
    },
    deleteLookedAtObject: () => {
       if (!sceneManagerRef.current) return;
       import('three').then(THREE => {
          const pos = sceneManagerRef.current!.getCameraPosition();
          const dir = sceneManagerRef.current!.getCameraDirection();
          const raycaster = new THREE.Raycaster(pos, dir.normalize());
          
          const intersects = raycaster.intersectObjects(sceneManagerRef.current!.scene.children, true);
          if (intersects.length > 0) {
            const findGroup = (obj: THREE.Object3D): THREE.Group | null => {
               if (obj.userData?.arObject) return obj as THREE.Group;
               if (obj.parent) return findGroup(obj.parent);
               return null;
            };
            
            for (let i = 0; i < intersects.length; i++) {
               const group = findGroup(intersects[i].object);
               if (group && group.uuid) {
                  firestoreService.deleteObject(group.uuid).catch(console.error);
                  break;
               }
            }
          }
       });
    }
  }));

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-transparent">
        <div ref={containerRef} className="absolute inset-0 w-full h-full bg-transparent" style={{ touchAction: 'none' }} />
        <div ref={buttonContainerRef} className="absolute inset-0 z-[100] pointer-events-none [&>button]:pointer-events-auto" />
    </div>
  );
});
