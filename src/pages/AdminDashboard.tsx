import React, { useState, useRef, useEffect } from "react";
import { ARCanvas, ARCanvasRef } from "../components/ARCanvas";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Plus,
  Trash2,
  Home,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { storageService } from "../firebase/storageService";
import { db } from "../firebase/firebase";
import { collection, onSnapshot, setDoc, doc } from "firebase/firestore";

interface CustomModel {
  id: string;
  name: string;
  url: string;
  pointsValue: number;
}

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const arRef = useRef<ARCanvasRef>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedType, setSelectedType] = useState<
    "cube" | "sphere" | "cylinder" | "local_model" | "cloud_model"
  >("cube");
  const [selectedColor, setSelectedColor] = useState<string>("#ff3366");

  const LOCAL_MODELS = [
    {
      id: "local-1",
      name: "Example Chest",
      url: "/models/chest.glb",
      pointsValue: 50,
    },
    {
      id: "local-2",
      name: "Old",
      url: "/models/Old.glb",
      pointsValue: 10,
    },
    {
      id: "local-3",
      name: "Knight",
      url: "/models/Knight.glb",
      pointsValue: 100,
    },
  ];
  const [activeLocalModel, setActiveLocalModel] = useState<CustomModel>(
    LOCAL_MODELS[0],
  );

  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [activeCloudModel, setActiveCloudModel] = useState<CustomModel | null>(
    null,
  );

  // Placement Options
  const [placeScale, setPlaceScale] = useState<number>(1);
  const [placeRotY, setPlaceRotY] = useState<number>(0);
  const [placeOffsetX, setPlaceOffsetX] = useState<number>(0);
  const [placeOffsetY, setPlaceOffsetY] = useState<number>(1.5);
  const [placeOffsetZ, setPlaceOffsetZ] = useState<number>(-0.5);

  const [selectedAdjustment, setSelectedAdjustment] = useState<'scale' | 'rotY' | 'offsetX' | 'offsetY' | 'offsetZ'>('offsetY');

  useEffect(() => {
    if (!sessionActive) {
      if (arRef.current) {
        arRef.current.clearPreview();
      }
      return;
    }
    const opts = { scale: placeScale, rotationY: placeRotY, offsetX: placeOffsetX, offsetY: placeOffsetY, offsetZ: placeOffsetZ };
    if (selectedType === 'local_model') {
      if (activeLocalModel) {
        arRef.current?.updatePreview('model', '#ffffff', activeLocalModel.url, opts);
      }
    } else if (selectedType === 'cloud_model') {
      if (activeCloudModel) {
        arRef.current?.updatePreview('model', '#ffffff', activeCloudModel.url, opts);
      }
    } else {
      arRef.current?.updatePreview(selectedType, selectedColor, undefined, opts);
    }
  }, [sessionActive, selectedType, selectedColor, activeLocalModel, activeCloudModel, placeScale, placeRotY, placeOffsetX, placeOffsetY, placeOffsetZ]);

  // Upload Form
  const [isUploading, setIsUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadPoints, setUploadPoints] = useState(10);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "adminModels"), (snapshot) => {
      const models: CustomModel[] = [];
      snapshot.forEach((doc) => {
        models.push({ id: doc.id, ...doc.data() } as CustomModel);
      });
      setCustomModels(models);
      if (models.length > 0 && !activeCloudModel)
        setActiveCloudModel(models[0]);
    });
    return () => unsub();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    try {
      const url = await storageService.uploadModel(uploadFile);
      const id = Date.now().toString();
      await setDoc(doc(db, "adminModels", id), {
        name: uploadName,
        url,
        pointsValue: Number(uploadPoints),
      });
      setUploadName("");
      setUploadPoints(10);
      setUploadFile(null);
      alert("Model uploaded effectively!");
    } catch (e: any) {
      alert("Error uploading: " + e.message);
    }
    setIsUploading(false);
  };

  if (loading || !user)
    return (
      <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center text-white">
        Loading...
      </div>
    );

  return (
    <div
      className={`relative w-full h-screen overflow-hidden ${sessionActive ? "bg-transparent" : "bg-[#0A0B0E] overflow-y-auto"}`}
    >
      <ARCanvas
        ref={arRef}
        isAdmin={true}
        onSessionStart={() => setSessionActive(true)}
        onSessionEnd={() => setSessionActive(false)}
      />

      {!sessionActive && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-start pointer-events-auto p-4 py-16 overflow-y-auto">
          <h1 className="text-4xl font-bold text-[#E0E2E5] mb-2 uppercase tracking-widest drop-shadow-md">
            Admin Dashboard
          </h1>

          <div className="flex gap-4 mb-8">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-[#525866] hover:text-[#00F0FF] bg-[#14161B]/80 border border-[#2D3139] px-4 py-2 rounded-sm text-[10px] font-mono tracking-widest uppercase transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              className="flex items-center gap-2 text-[#525866] hover:text-[#FF0055] bg-[#14161B]/80 border border-[#2D3139] px-4 py-2 rounded-sm text-[10px] font-mono tracking-widest uppercase transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          <div className="bg-[#14161B] border border-[#2D3139] p-6 rounded-sm w-full max-w-md mb-8">
            <h2 className="text-[#00F0FF] text-sm uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Custom 3D Model
            </h2>
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">
                  Model Name
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  required
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] text-[#E0E2E5] p-2 rounded-sm text-xs font-mono uppercase focus:border-[#00F0FF] outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">
                  Points Value
                </label>
                <input
                  type="number"
                  value={uploadPoints}
                  onChange={(e) => setUploadPoints(Number(e.target.value))}
                  required
                  className="w-full bg-[#0A0B0E] border border-[#2D3139] text-[#E0E2E5] p-2 rounded-sm text-xs font-mono uppercase focus:border-[#00F0FF] outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">
                  .GLB / .GLTF File
                </label>
                <input
                  type="file"
                  accept=".glb,.gltf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-[#E0E2E5] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-[10px] file:font-mono file:tracking-widest file:bg-[#1C1F26] file:text-[#00F0FF] hover:file:bg-[#2D3139] mt-1"
                />
              </div>
              <button
                disabled={isUploading}
                type="submit"
                className="bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-[#0A0B0E] py-2 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-colors disabled:opacity-50 mt-2"
              >
                {isUploading ? "Uploading..." : "Upload Model"}
              </button>
            </form>
          </div>
          <p className="text-[10px] text-[#8E9299] font-mono tracking-widest uppercase text-center max-w-md drop-shadow max-w-sm mb-4">
            UPLOAD MODELS ABOVE OR CLICK AR CONTROLS TO ENTER THE WORLD.
          </p>
        </div>
      )}

      {sessionActive && (
        <div className="absolute inset-0 z-[9998] pointer-events-none flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/50 rounded-full flex items-center justify-center backdrop-blur-sm">
            <div className="w-1 h-1 bg-[#FF0055] rounded-full"></div>
          </div>
        </div>
      )}

      {sessionActive && (
        <div className="absolute inset-0 z-[9999] pointer-events-none flex flex-col justify-end p-4 pb-8">
          <div className="mx-auto bg-[#14161B]/90 backdrop-blur-md rounded-sm p-4 flex gap-4 pointer-events-auto border border-[#2D3139] shadow-2xl mb-4 overflow-x-auto max-w-full">
            <div className="flex flex-col gap-2 border-r border-[#2D3139] pr-4 shrink-0">
              <label className="text-[9px] font-bold text-[#8E9299] uppercase tracking-[0.2em] mb-1">
                Shape
              </label>
              <div className="flex gap-2">
                {[
                  "cube",
                  "sphere",
                  "cylinder",
                  "local_model",
                  "cloud_model",
                ].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t as any)}
                    className={`px-3 py-2 rounded-sm text-[10px] font-mono uppercase tracking-widest transition-colors border ${selectedType === t ? "bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]" : "bg-[#1C1F26] text-[#525866] border-[#2D3139] hover:bg-[#1C1F26]/80 hover:text-[#8E9299]"}`}
                  >
                    {t === "cube" ? "S-Shape" : t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {selectedType === "local_model" ? (
              <div className="flex flex-col gap-1 justify-center min-w-[200px]">
                <label className="text-[9px] font-bold text-[#8E9299] uppercase tracking-[0.2em]">
                  Local Repo Model
                </label>
                <select
                  className="bg-[#1C1F26] text-[#E0E2E5] border border-[#2D3139] text-xs p-1 rounded-sm outline-none"
                  onChange={(e) =>
                    setActiveLocalModel(
                      LOCAL_MODELS.find((m) => m.id === e.target.value) ||
                        LOCAL_MODELS[0],
                    )
                  }
                  value={activeLocalModel.id}
                >
                  {LOCAL_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.pointsValue} pts)
                    </option>
                  ))}
                </select>
              </div>
            ) : selectedType === "cloud_model" ? (
              <div className="flex flex-col gap-1 justify-center min-w-[200px]">
                <label className="text-[9px] font-bold text-[#8E9299] uppercase tracking-[0.2em]">
                  Cloud Uploads
                </label>
                {customModels.length === 0 ? (
                  <span className="text-[10px] text-[#FF0055]">
                    No models uploaded
                  </span>
                ) : (
                  <select
                    className="bg-[#1C1F26] text-[#E0E2E5] border border-[#2D3139] text-xs p-1 rounded-sm outline-none"
                    onChange={(e) =>
                      setActiveCloudModel(
                        customModels.find((m) => m.id === e.target.value) ||
                          null,
                      )
                    }
                    value={activeCloudModel?.id || ""}
                  >
                    {customModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.pointsValue} pts)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1 justify-center shrink-0">
                <label className="text-[9px] font-bold text-[#8E9299] uppercase tracking-[0.2em]">
                  Color
                </label>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-10 h-10 rounded-sm cursor-pointer bg-[#1C1F26] border border-[#2D3139] p-0"
                />
              </div>
            )}
          </div>

          <div className="flex gap-4 mb-4 bg-[#14161B]/90 backdrop-blur-md p-4 rounded-sm border border-[#2D3139] pointer-events-auto overflow-x-auto max-w-sm mx-auto w-full items-center">
            <div className="flex flex-col gap-1 shrink-0 w-24">
              <label className="text-[9px] font-bold text-[#8E9299] uppercase tracking-[0.2em]">Adjust</label>
              <select
                className="bg-[#1C1F26] text-[#E0E2E5] border border-[#2D3139] text-[10px] p-2 rounded-sm outline-none w-full"
                value={selectedAdjustment}
                onChange={(e) => setSelectedAdjustment(e.target.value as any)}
              >
                <option value="scale">Scale</option>
                <option value="rotY">Rot Z</option>
                <option value="offsetX">Offset X</option>
                <option value="offsetY">Offset Y</option>
                <option value="offsetZ">Offset Z</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2 flex-1 pt-1 border-l pl-4 border-[#2D3139]">
              {(function() {
                const cfg = {
                  scale: { min: 0.1, max: 1000, step: 0.1, val: placeScale, set: setPlaceScale, unit: 'x' },
                  rotY: { min: -180, max: 180, step: 1, val: placeRotY, set: setPlaceRotY, unit: '°' },
                  offsetX: { min: -500, max: 500, step: 0.1, val: placeOffsetX, set: setPlaceOffsetX, unit: 'm' },
                  offsetY: { min: -500, max: 500, step: 0.1, val: placeOffsetY, set: setPlaceOffsetY, unit: 'm' },
                  offsetZ: { min: -500, max: 500, step: 0.1, val: placeOffsetZ, set: setPlaceOffsetZ, unit: 'm' },
                }[selectedAdjustment];

                const round = (num: number) => Number(num.toFixed(2));
                const increase = () => cfg.set(Math.min(cfg.max, round(cfg.val + cfg.step)));
                const decrease = () => cfg.set(Math.max(cfg.min, round(cfg.val - cfg.step)));

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <button onClick={decrease} className="w-8 h-8 rounded-sm bg-[#1C1F26] border border-[#2D3139] text-[#E0E2E5] hover:bg-[#2D3139] flex items-center justify-center font-bold">-</button>
                      <span className="text-xs font-mono text-[#00F0FF]">{cfg.val}{cfg.unit}</span>
                      <button onClick={increase} className="w-8 h-8 rounded-sm bg-[#1C1F26] border border-[#2D3139] text-[#E0E2E5] hover:bg-[#2D3139] flex items-center justify-center font-bold">+</button>
                    </div>
                    <input
                      type="range"
                      min={cfg.min}
                      max={cfg.max}
                      step={cfg.step}
                      value={cfg.val}
                      onChange={(e) => cfg.set(parseFloat(e.target.value))}
                      className="w-full accent-[#00F0FF]"
                    />
                  </>
                );
              })()}
            </div>
          </div>

          <div className="flex justify-center gap-4 pointer-events-auto">
            <button
              onClick={() => arRef.current?.reanchor()}
              className="flex items-center justify-center gap-2 px-4 h-12 bg-[#2D3139] text-[#E0E2E5] rounded-sm shadow-[0_0_20px_rgba(45,49,57,0.2)] hover:bg-[#2D3139]/80 transition border border-[#525866]"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-widest uppercase hidden sm:block">
                Re-Sync GPS
              </span>
            </button>
            <button
              onClick={() => {
                const opts = {
                  scale: placeScale,
                  rotationY: placeRotY,
                  offsetX: placeOffsetX,
                  offsetY: placeOffsetY,
                  offsetZ: placeOffsetZ,
                };
                if (selectedType === "local_model") {
                  if (activeLocalModel) {
                    arRef.current?.placeObject(
                      "model",
                      "#ffffff",
                      activeLocalModel.url,
                      activeLocalModel.pointsValue,
                      activeLocalModel.name,
                      opts,
                    );
                  }
                } else if (selectedType === "cloud_model") {
                  if (activeCloudModel) {
                    arRef.current?.placeObject(
                      "model",
                      "#ffffff",
                      activeCloudModel.url,
                      activeCloudModel.pointsValue,
                      activeCloudModel.name,
                      opts,
                    );
                  } else {
                    alert("Please upload and select a model first.");
                  }
                } else {
                  arRef.current?.placeObject(
                    selectedType,
                    selectedColor,
                    undefined,
                    10,
                    selectedType.toUpperCase(),
                    opts,
                  );
                }
              }}
              className="flex items-center gap-2 px-8 py-4 bg-[#00F0FF] text-[#0A0B0E] rounded-sm font-bold shadow-[0_0_20px_rgba(0,240,255,0.2)] text-[10px] uppercase tracking-widest hover:bg-[#00F0FF]/90 transition"
            >
              <Plus className="w-4 h-4" />
              Place Object
            </button>
            <button
              onClick={() => arRef.current?.deleteLookedAtObject()}
              className="flex items-center justify-center gap-2 px-4 h-12 bg-[#FF0055] text-white rounded-sm shadow-[0_0_20px_rgba(255,0,85,0.2)] hover:bg-[#FF0055]/90 transition border border-[#FF0055]"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-widest uppercase hidden sm:block">
                Delete Target
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
