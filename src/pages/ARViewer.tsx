import React, { useState } from 'react';
import { ARCanvas } from '../components/ARCanvas';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Crosshair } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ARViewer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const arRef = React.useRef<any>(null);
  const [sessionActive, setSessionActive] = useState(false);

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className={`relative w-full h-screen overflow-hidden ${sessionActive ? 'bg-transparent' : 'bg-[#0A0B0E]'}`}>
      <ARCanvas 
        ref={arRef}
        isAdmin={false} 
        onSessionStart={() => setSessionActive(true)}
        onSessionEnd={() => setSessionActive(false)}
      />
      
      {!sessionActive && (
        <div className="absolute top-4 left-4 z-10">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1 bg-[#1C1F26]/90 border border-[#2D3139] backdrop-blur-md text-[#00F0FF] text-[10px] uppercase font-mono tracking-widest rounded-sm hover:bg-[#00F0FF]/10 transition"
          >
            <ChevronLeft className="w-3 h-3" />
            Home
          </button>
        </div>
      )}
      
      {!sessionActive && (
        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none p-4 z-0">
            <h1 className="text-4xl font-bold text-[#E0E2E5] mb-2 text-center uppercase tracking-widest drop-shadow-lg">AR Viewer</h1>
            <p className="text-[#8E9299] text-[10px] font-mono tracking-widest uppercase max-w-sm text-center drop-shadow mt-4">
               FIND A FLAT SURFACE AND CLICK THE BUTTON BELOW TO SEE SHARED OBJECTS IN THE REAL WORLD.
            </p>
            <p className="text-[#FF0055] text-[10px] font-mono font-bold tracking-widest uppercase max-w-sm text-center drop-shadow mt-4 bg-[#FF0055]/10 p-3 rounded border border-[#FF0055]/20">
               NOTE: For perfect alignment, please start the AR Session from the exact same physical spot and facing the same direction as the Admin.
            </p>
        </div>
      )}
      
      {sessionActive && (
        <div className="absolute inset-0 z-[9999] pointer-events-none flex flex-col justify-between p-4">
          <div className="flex justify-between items-start pointer-events-auto w-full">
            <div className="flex gap-2">
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-3 bg-[#1C1F26]/90 border border-[#2D3139] backdrop-blur-md text-[#FF0055] hover:text-white text-[10px] uppercase font-mono tracking-widest rounded-sm transition"
              >
                Exit
              </button>
              <button 
                onClick={() => arRef.current?.reanchor()}
                className="flex items-center gap-2 px-4 py-3 bg-[#1C1F26]/90 border border-[#2D3139] backdrop-blur-md text-[#00F0FF] hover:bg-[#00F0FF]/10 text-[10px] uppercase font-mono tracking-widest rounded-sm transition"
              >
                <RefreshCw className="w-3 h-3" />
                Re-Sync GPS
              </button>
            </div>
            <div className="bg-[#1C1F26]/90 border border-[#2D3139] backdrop-blur-md px-4 py-2 rounded-sm text-[#00F0FF] text-[10px] uppercase font-mono tracking-widest">
              Score: {user.score || 0}
            </div>
          </div>
          
          {/* Crosshair for targeting objects */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-2 border-[#00F0FF]/50 rounded-full flex items-center justify-center backdrop-blur-sm">
              <div className="w-1.5 h-1.5 bg-[#00F0FF] rounded-full"></div>
            </div>
          </div>

          <div className="flex justify-center pb-8 pointer-events-auto">
            <button 
              onClick={() => arRef.current?.collectLookedAtObject(user.id)}
              className="flex items-center gap-2 px-8 py-4 bg-[#00F0FF] text-[#0A0B0E] font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-[#00F0FF]/90 transition shadow-[0_0_30px_rgba(0,240,255,0.3)]"
            >
              <Crosshair className="w-5 h-5" />
              Collect Object
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
