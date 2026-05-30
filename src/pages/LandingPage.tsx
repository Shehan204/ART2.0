import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ARSessionManager } from '../ar/ARSessionManager';
import { Cuboid, Map, Shield, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { firestoreService } from '../firebase/firestoreService';
import { User } from '../types';

export default function LandingPage() {
  const navigate = useNavigate();
  const [arSupported, setArSupported] = React.useState<boolean | null>(null);
  const { user, logout } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);

  React.useEffect(() => {
    ARSessionManager.isARSupported().then(setArSupported);
    const unsub = firestoreService.subscribeToUsers(setUsers);
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#E0E2E5] font-sans flex flex-col overflow-y-auto">
      <header className="h-14 border-b border-[#2D3139] bg-[#14161B] px-6 flex justify-between items-center w-full shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#00F0FF] rounded-sm flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[#0A0B0E]"></div>
          </div>
          <span className="font-bold tracking-tighter text-lg uppercase text-[#E0E2E5]">
            Knight Quest <span className="text-[#00F0FF]">AR</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          {!user ? (
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-3 py-1 rounded bg-[#1C1F26] border border-[#2D3139] text-[#00F0FF] text-[10px] font-mono tracking-widest uppercase hover:bg-[#00F0FF]/10 transition-colors"
            >
              <Shield className="w-3 h-3" />
              Login
            </button>
          ) : (
            <>
              {user.role === 'admin' && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="flex items-center gap-2 px-3 py-1 rounded bg-[#FF0055]/10 border border-[#FF0055]/30 text-[#FF0055] text-[10px] font-mono tracking-widest uppercase hover:bg-[#FF0055]/20 transition-colors"
                >
                  <Shield className="w-3 h-3" />
                  Admin
                </button>
              )}
              <button 
                onClick={() => logout()}
                className="flex items-center gap-2 px-3 py-1 rounded bg-[#1C1F26] border border-[#2D3139] text-[#8E9299] text-[10px] font-mono tracking-widest uppercase hover:text-white transition-colors"
              >
                Logout ({user.username})
              </button>
            </>
          )}
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center p-6 text-center max-w-4xl mx-auto w-full relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="w-full h-full border border-[#00F0FF]/10" style={{ backgroundImage: 'radial-gradient(#00F0FF 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>
        
        <div className="my-16 flex flex-col items-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 uppercase text-[#E0E2E5] z-10">
            Shared World <br/><span className="text-[#00F0FF]">Augmented Reality</span>
          </h1>
          <p className="text-sm font-mono text-[#8E9299] mb-12 max-w-2xl z-10">
            EXPERIENCE PERSISTENT DIGITAL OBJECTS ANCHORED IN THE REAL WORLD. COLLECT MODELS PLACED BY ADMINS TO EARN POINTS!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto z-10">
            <button 
              onClick={() => {
                if (!user) { navigate('/login'); return; }
                navigate('/ar');
              }}
              disabled={arSupported === false}
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-[#00F0FF] hover:bg-[#00F0FF]/80 disabled:bg-[#1C1F26] disabled:text-[#525866] disabled:border-[#2D3139] disabled:border disabled:cursor-not-allowed text-[#0A0B0E] px-8 py-4 rounded-sm font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)] disabled:shadow-none"
            >
              <Map className="w-4 h-4" />
              {arSupported === false ? 'AR NOT SUPPORTED' : (!user ? 'LOGIN TO ENTER AR WORLD' : 'ENTER AR WORLD')}
            </button>
          </div>

          {arSupported === false && (
            <div className="mt-8 flex flex-col items-center gap-4 z-10 max-w-md">
              <p className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-[#FF0055] bg-[#FF0055]/10 py-3 px-4 rounded border border-[#FF0055]/30 text-center">
                WARNING: YOUR BROWSER DOES NOT SUPPORT WEBXR AR.<br /><br />
                <span className="text-[#E0E2E5]">IPHONE/IOS USERS: Apple Safari does not support WebXR yet. Please download the "WebXR Viewer" app by Mozilla from the App Store and open this link inside it.</span>
              </p>
            </div>
          )}
        </div>

        {/* Leaderboard Section */}
        <div className="w-full max-w-2xl mt-8 z-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-[#FFD700]" />
            <h2 className="text-2xl font-bold tracking-widest uppercase text-[#E0E2E5]">Leaderboard</h2>
          </div>
          
          <div className="bg-[#14161B] border border-[#2D3139] rounded-sm overflow-hidden text-left shadow-lg">
            <div className="grid grid-cols-3 bg-[#1C1F26] p-4 border-b border-[#2D3139] text-[10px] uppercase tracking-widest font-bold text-[#8E9299]">
               <div>Rank</div>
               <div>Player</div>
               <div className="text-right">Points</div>
            </div>
            {users.length === 0 && (
               <div className="p-8 text-center text-[#525866] font-mono text-xs tracking-widest uppercase">
                 No players yet
               </div>
            )}
            {users.map((u, i) => (
              <div key={u.uid} className={`grid grid-cols-3 p-4 border-b border-[#2D3139]/50 text-sm font-mono ${user && user.uid === u.uid ? 'bg-[#00F0FF]/5 text-[#00F0FF]' : 'text-[#E0E2E5]'}`}>
                <div className="flex items-center gap-2">
                   {i === 0 && <Trophy className="w-4 h-4 text-[#FFD700]" />}
                   {i === 1 && <Trophy className="w-4 h-4 text-[#C0C0C0]" />}
                   {i === 2 && <Trophy className="w-4 h-4 text-[#CD7F32]" />}
                   {i > 2 && <span className="opacity-50">#{i + 1}</span>}
                </div>
                <div className="truncate font-bold">{u.username} {user && user.uid === u.uid ? '(You)' : ''}</div>
                <div className="text-right tracking-widest text-[#00F0FF]">{u.points.toLocaleString()} PTS</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
