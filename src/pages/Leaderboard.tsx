import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../firebase/firestoreService';
import { UserData } from '../types';
import { Trophy, ChevronLeft, Medal } from 'lucide-react';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firestoreService.subscribeToLeaderboard((fetchedUsers) => {
      setUsers(fetchedUsers);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0E] p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl mt-4 mb-8 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1C1F26] border border-[#2D3139] text-[#8E9299] hover:text-[#00F0FF] text-[10px] uppercase font-mono tracking-widest rounded-sm transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Home
        </button>
      </div>
      
      <div className="w-full max-w-2xl bg-[#14161B] border border-[#2D3139] rounded-sm p-6 sm:p-8 flex flex-col items-center shadow-lg">
        <Trophy className="w-16 h-16 text-[#FFD700] mb-4 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
        <h1 className="text-3xl font-bold text-[#E0E2E5] mb-2 text-center uppercase tracking-widest drop-shadow-md">Leaderboard</h1>
        <p className="text-[10px] text-[#8E9299] mb-8 text-center font-mono uppercase tracking-widest">
          TOP COLLECTORS IN THE SHARED AR WORLD
        </p>

        {loading ? (
          <div className="text-[#00F0FF] animate-pulse font-mono text-sm uppercase tracking-widest">Loading ranks...</div>
        ) : (
          <div className="w-full flex flex-col gap-2">
            {users.map((user, index) => (
              <div 
                key={user.id} 
                className={`flex items-center justify-between p-4 rounded-sm border ${
                  index === 0 ? 'bg-[#FFD700]/10 border-[#FFD700]/50' : 
                  index === 1 ? 'bg-[#C0C0C0]/10 border-[#C0C0C0]/50' : 
                  index === 2 ? 'bg-[#CD7F32]/10 border-[#CD7F32]/50' : 
                  'bg-[#0A0B0E] border-[#2D3139]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-lg font-bold font-mono w-8 text-center ${
                    index === 0 ? 'text-[#FFD700]' : 
                    index === 1 ? 'text-[#C0C0C0]' : 
                    index === 2 ? 'text-[#CD7F32]' : 
                    'text-[#525866]'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-bold uppercase tracking-wider ${index < 3 ? 'text-[#E0E2E5]' : 'text-[#8E9299]'}`}>
                      {user.username}
                    </span>
                    {index === 0 && <span className="text-[8px] text-[#FFD700] uppercase tracking-widest font-mono">Champion</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[#00F0FF] font-bold font-mono text-xl">{user.score}</span>
                  <span className="text-[#525866] text-[10px] uppercase font-mono tracking-widest">PTS</span>
                </div>
              </div>
            ))}
            
            {users.length === 0 && (
              <div className="text-center text-[#8E9299] p-8 font-mono text-xs uppercase tracking-widest">
                No collectors yet. Be the first!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
