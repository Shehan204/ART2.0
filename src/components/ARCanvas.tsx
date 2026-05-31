import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { SceneManager } from "../ar/SceneManager";
import { firestoreService } from "../firebase/firestoreService";
import { compassService } from "../utils/compass";
import { ARObject } from "../types";
import { v4 as uuidv4 } from "uuid";
import { haversineDistance } from "../utils/gps";

export interface ARCanvasRef {
  placeObject: (
    type: ARObject["type"],
    color: string,
    modelUrl?: string,
    pointsValue?: number,
    name?: string,
    options?: {
      scale?: number;
      rotationZ?: number;
      offsetX?: number;
      offsetY?: number;
      offsetZ?: number;
    },
  ) => void;
  deleteLookedAtObject: () => void;
  collectLookedAtObject: (userId: string) => Promise<boolean>;
  reanchor: () => void;
}

interface ARCanvasProps {
  isAdmin: boolean;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  onReady?: () => void;
}

export const ARCanvas = forwardRef<ARCanvasRef, ARCanvasProps>(
  ({ isAdmin, onSessionStart, onSessionEnd, onReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonContainerRef = useRef<HTMLDivElement>(null);
    const sceneManagerRef = useRef<SceneManager | null>(null);
    const [objects, setObjects] = useState<ARObject[]>([]);
    const [currentLocation, setCurrentLocation] = useState<{
      lat: number;
      lng: number;
    } | null>(null);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
    const [liveHeading, setLiveHeading] = useState<number | null>(null);
    const sessionActiveRef = useRef(false);
    const [needsCompassPermission, setNeedsCompassPermission] = useState(
      compassService.requiresPermission(),
    );

    useEffect(() => {
      if (!needsCompassPermission) {
        compassService.start();
      }
      return () => compassService.stop();
    }, [needsCompassPermission]);

    useEffect(() => {
      // Watch GPS Position
      if (navigator.geolocation && navigator.geolocation.watchPosition) {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            setCurrentLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            setGpsAccuracy(pos.coords.accuracy);
          },
          (err) => console.warn("GPS tracking error", err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 },
        );

        // Poll compass for live UI updates
        const interval = setInterval(() => {
          setLiveHeading(compassService.heading);
        }, 500);

        return () => {
          navigator.geolocation.clearWatch(watchId);
          clearInterval(interval);
        };
      } else {
        console.warn("Geolocation not supported by this environment");
      }
    }, []);

    const callbacksRef = useRef({
      isAdmin,
      onSessionStart,
      onSessionEnd,
      onReady,
    });
    useEffect(() => {
      callbacksRef.current = { isAdmin, onSessionStart, onSessionEnd, onReady };
    }, [isAdmin, onSessionStart, onSessionEnd, onReady]);

    useEffect(() => {
      if (!containerRef.current || !buttonContainerRef.current) return;

      sceneManagerRef.current = new SceneManager(containerRef.current);
      const sceneManager = sceneManagerRef.current;

      // Simple AR button, no hit test or local floor required
      const button = ARButton.createButton(sceneManager.renderer, {
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: document.body },
      });

      button.style.position = "absolute";
      button.style.bottom = "20px";
      button.style.padding = "12px 24px";
      button.style.border = "1px solid #00F0FF";
      button.style.borderRadius = "2px";
      button.style.background = "#0A0B0E";
      button.style.color = "#00F0FF";
      button.style.fontFamily = "monospace";
      button.style.fontSize = "12px";
      button.style.fontWeight = "bold";
      button.style.textTransform = "uppercase";
      button.style.letterSpacing = "0.1em";
      button.style.outline = "none";
      button.style.zIndex = "999";
      button.style.cursor = "pointer";
      button.style.left = "50%";
      button.style.transform = "translateX(-50%)";
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
        import("three").then((THREE) => {
          const controller = sceneManager.renderer.xr.getController(0);
          const tempMatrix = new THREE.Matrix4();
          tempMatrix.identity().extractRotation(controller.matrixWorld);

          const raycaster = new THREE.Raycaster();
          raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
          raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

          const intersects = raycaster.intersectObjects(
            sceneManager.scene.children,
            true,
          );
          if (intersects.length > 0) {
            const findGroup = (obj: THREE.Object3D): THREE.Group | null => {
              if (obj.userData?.arObject) return obj as THREE.Group;
              if (obj.parent) return findGroup(obj.parent);
              return null;
            };

            for (let i = 0; i < intersects.length; i++) {
              const group = findGroup(intersects[i].object);
              if (group && group.userData?.arObject?.id) {
                firestoreService
                  .deleteObject(group.userData.arObject.id)
                  .catch(console.error);
                return;
              }
            }
          }
        });
      };

      const controller = sceneManager.renderer.xr.getController(0);
      controller.addEventListener("select", onSelect);
      sceneManager.scene.add(controller);

      if (callbacksRef.current.onReady) callbacksRef.current.onReady();

      sceneManager.renderer.xr.addEventListener("sessionstart", () => {
        sessionActiveRef.current = true;
        if (buttonContainerRef.current)
          buttonContainerRef.current.style.display = "none";
        if (callbacksRef.current.onSessionStart)
          callbacksRef.current.onSessionStart();
      });
      sceneManager.renderer.xr.addEventListener("sessionend", () => {
        sessionActiveRef.current = false;
        if (buttonContainerRef.current)
          buttonContainerRef.current.style.display = "block";
        if (callbacksRef.current.onSessionEnd)
          callbacksRef.current.onSessionEnd();
      });

      const unsubscribe = firestoreService.subscribeToObjects((fetched) =>
        setObjects(fetched),
      );

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

      // Continuously update originGPS to current physical location BEFORE AR session starts
      // This ensures that when AR starts, the WebXR origin (0,0,0) perfectly aligns with the latest GPS.
      // Once AR starts, we stop updating originGPS so the world stays anchored.
      if (!sessionActiveRef.current && currentLocation) {
        sceneManagerRef.current.setOriginGPSAndHeading(
          currentLocation.lat,
          currentLocation.lng,
          compassService.heading || 0,
        );
      }

      let filteredObjects = objects;
      if (currentLocation) {
        // Filter within 200m
        filteredObjects = objects.filter(
          (o) =>
            haversineDistance(currentLocation, {
              lat: o.latitude,
              lng: o.longitude,
            }) <= 200,
        );
      }

      sceneManagerRef.current.syncObjects(filteredObjects);
    }, [objects, currentLocation]);

    useImperativeHandle(
      ref,
      () => ({
        placeObject: async (
          type: ARObject["type"],
          color: string,
          modelUrl?: string,
          pointsValue?: number,
          name?: string,
          options?: {
            scale?: number;
            rotationZ?: number;
            offsetX?: number;
            offsetY?: number;
            offsetZ?: number;
          },
        ) => {
          let finalLat = 0;
          let finalLng = 0;

          const offsetX = options?.offsetX ?? 0;
          const offsetY = options?.offsetY ?? -0.5;
          const offsetZ = options?.offsetZ ?? 1.5;
          const scale = options?.scale ?? 1;
          const rotZ = options?.rotationZ ?? 0;

          if (sceneManagerRef.current && sceneManagerRef.current.originGPS) {
            // Calculate AR-perfect GPS coordinate by translating camera position 1.5m forward
            const pos = sceneManagerRef.current.getCameraPosition();
            const dir = sceneManagerRef.current.getCameraDirection();

            // Find the absolute world coordinate 1.5m in front of the camera
            const worldTarget = new THREE.Vector3(
              pos.x + dir.x * offsetZ + offsetX,
              pos.y + dir.y * offsetZ,
              pos.z + dir.z * offsetZ,
            );

            // Convert that world coordinate into the objectsGroup's local space (which handles un-rotating the compass heading)
            const localTarget =
              sceneManagerRef.current.objectsGroup.worldToLocal(
                worldTarget.clone(),
              );

            const calculatedGPS = await import("../utils/gps").then((m) =>
              m.localToGps(
                localTarget.x,
                localTarget.z,
                sceneManagerRef.current!.originGPS!.lat,
                sceneManagerRef.current!.originGPS!.lng,
              ),
            );
            finalLat = calculatedGPS.lat;
            finalLng = calculatedGPS.lng;
          } else {
            // Fallback to raw GPS if AR session isn't fully established
            let loc = currentLocation;
            if (!loc) {
              try {
                loc = await new Promise<{ lat: number; lng: number }>(
                  (resolve, reject) => {
                    if (!navigator.geolocation)
                      return reject(new Error("No geolocation"));
                    navigator.geolocation.getCurrentPosition(
                      (pos) =>
                        resolve({
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                        }),
                      (err) => reject(err),
                      { enableHighAccuracy: true, timeout: 3000 },
                    );
                  },
                );
                setCurrentLocation(loc);
              } catch (error) {
                console.error(
                  "No origin GPS and no current GPS available. Cannot place object.",
                  error,
                );
                return;
              }
            }
            finalLat = loc.lat;
            finalLng = loc.lng;
          }

          const newObj: ARObject = {
            id: uuidv4(),
            type,
            modelUrl,
            name: name || "Object",
            pointsValue: pointsValue || 10,
            latitude: finalLat,
            longitude: finalLng,
            altitude: offsetY, // slightly below camera height by default
            scale: scale,
            rotation: { x: 0, y: 0, z: (rotZ * Math.PI) / 180 },
            color,
            createdAt: Date.now(),
          };

          try {
            await firestoreService.saveObject(newObj);
            console.log("Object placed successfully");
          } catch (e) {
            console.error("Failed to save object", e);
            alert("Failed to place object: " + (e as Error).message);
          }
        },
        deleteLookedAtObject: () => {
          if (!sceneManagerRef.current) return;
          import("three").then((THREE) => {
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(
              new THREE.Vector2(0, 0),
              sceneManagerRef.current!.camera,
            );

            const intersects = raycaster.intersectObjects(
              sceneManagerRef.current!.scene.children,
              true,
            );
            if (intersects.length > 0) {
              const findGroup = (obj: THREE.Object3D): THREE.Group | null => {
                if (obj.userData?.arObject) return obj as THREE.Group;
                if (obj.parent) return findGroup(obj.parent);
                return null;
              };

              for (let i = 0; i < intersects.length; i++) {
                const group = findGroup(intersects[i].object);
                if (group && group.userData?.arObject?.id) {
                  firestoreService
                    .deleteObject(group.userData.arObject.id)
                    .catch(console.error);
                  break;
                }
              }
            }
          });
        },
        collectLookedAtObject: async (userId: string) => {
          if (!sceneManagerRef.current || !currentLocation) return false;
          const THREE = await import("three");
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(
            new THREE.Vector2(0, 0),
            sceneManagerRef.current!.camera,
          );

          const intersects = raycaster.intersectObjects(
            sceneManagerRef.current!.scene.children,
            true,
          );
          if (intersects.length > 0) {
            const findGroup = (obj: THREE.Object3D): THREE.Group | null => {
              if (obj.userData?.arObject) return obj as THREE.Group;
              if (obj.parent) return findGroup(obj.parent);
              return null;
            };

            for (let i = 0; i < intersects.length; i++) {
              const group = findGroup(intersects[i].object);
              if (group && group.userData?.arObject) {
                const objData = group.userData.arObject as ARObject;

                // Distance check: e.g., 20 meters
                const dist = haversineDistance(currentLocation, {
                  lat: objData.latitude,
                  lng: objData.longitude,
                });
                if (dist <= 20) {
                  try {
                    await firestoreService.collectObject(
                      objData.id,
                      userId,
                      objData.pointsValue || 10,
                    );
                    return true;
                  } catch (e) {
                    console.error("Failed to collect", e);
                    return false;
                  }
                } else {
                  alert(
                    `You are too far! Distance: ${Math.round(dist)}m (Need to be <20m). Walk closer!`,
                  );
                  return false;
                }
              }
            }
          }
          return false;
        },
        reanchor: () => {
          if (!sceneManagerRef.current || !currentLocation) {
            alert("Cannot re-sync: GPS location not available yet.");
            return;
          }
          const sm = sceneManagerRef.current;
          const heading = compassService.heading || 0;

          const pos = sm.getCameraPosition();
          const dir = sm.getCameraDirection();

          // Move the origin of the AR world to the camera's current physical position
          sm.objectsGroup.position.copy(pos);

          // Rotate the AR world so its North aligns with physical True North based on camera's current direction
          const cameraY = Math.atan2(dir.x, dir.z) + Math.PI;
          sm.objectsGroup.rotation.y = cameraY + (heading * Math.PI) / 180;

          // Lock in the new GPS and Heading
          sm.originGPS = { lat: currentLocation.lat, lng: currentLocation.lng };
          sm.originHeading = heading;
          sm.syncObjects(sm.currentARObjects);

          console.log(
            "Re-anchored AR world to",
            currentLocation,
            "heading:",
            heading,
          );
        },
      }),
      [currentLocation],
    );

    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-transparent">
        {needsCompassPermission && (
          <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-[#0A0B0E]/90 backdrop-blur-sm p-4 text-center">
            <h2 className="text-xl font-bold text-[#E0E2E5] mb-2 uppercase tracking-widest drop-shadow-md">
              Compass Access
            </h2>
            <p className="text-[#8E9299] text-[10px] font-mono mb-6 max-w-sm uppercase tracking-widest drop-shadow">
              To align AR objects with the real world, this app needs access to
              your device's compass.
            </p>
            <button
              onClick={async () => {
                const granted = await compassService.requestPermission();
                if (!granted) {
                  alert(
                    "Compass permission denied. AR alignment will be inaccurate.",
                  );
                }
                setNeedsCompassPermission(false);
              }}
              className="flex items-center gap-2 px-8 py-4 bg-[#00F0FF] text-[#0A0B0E] rounded-sm font-bold shadow-[0_0_20px_rgba(0,240,255,0.2)] text-[10px] uppercase tracking-widest hover:bg-[#00F0FF]/90 transition"
            >
              Grant Access
            </button>
          </div>
        )}

        {/* Debug UI for Admins to diagnose shifting */}
        {isAdmin && (
          <div className="absolute top-24 left-4 z-[998] pointer-events-none bg-[#0A0B0E]/80 border border-[#2D3139] text-[#00F0FF] p-3 rounded-sm text-[10px] font-mono tracking-wider backdrop-blur-md">
            <div className="font-bold text-[#E0E2E5] mb-1">SENSOR DEBUG</div>
            <div>
              GPS Acc:{" "}
              <span
                className={
                  gpsAccuracy && gpsAccuracy > 15
                    ? "text-[#FF0055]"
                    : "text-[#00FF00]"
                }
              >
                {gpsAccuracy ? `${gpsAccuracy.toFixed(1)}m` : "Wait..."}
              </span>
            </div>
            <div>
              Heading:{" "}
              {liveHeading !== null ? `${liveHeading.toFixed(1)}°` : "Wait..."}
            </div>
            <div>Objects Loaded: {objects.length}</div>
            {objects.length > 0 && currentLocation && (
              <div>
                Nearest:{" "}
                {Math.min(
                  ...objects.map((o) =>
                    haversineDistance(currentLocation, {
                      lat: o.latitude,
                      lng: o.longitude,
                    }),
                  ),
                ).toFixed(1)}
                m away
              </div>
            )}
            <div className="text-[#8E9299] mt-1 text-[8px] max-w-[120px] leading-tight">
              If Acc &gt; 10m or Heading is wrong, objects will shift.
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full bg-transparent"
          style={{ touchAction: "none" }}
        />
        <div
          ref={buttonContainerRef}
          className="absolute inset-0 z-[100] pointer-events-none [&>button]:pointer-events-auto"
        />
      </div>
    );
  },
);
