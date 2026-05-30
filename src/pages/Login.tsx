import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

export default function Login() {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [isSign, setIsSign] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [adminSecret, setAdminSecret] = useState('');

  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      else navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSign) {
        const isAdmin = adminSecret === '0000'; // Hardcoded admin secret for demo
        await signup(email, password, username, isAdmin);
      } else {
        await login(email, password);
      }
    } catch (error: any) {
      alert('Authentication failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] flex items-center justify-center p-4">
      <div className="bg-[#14161B] p-8 rounded-sm border border-[#2D3139] w-full max-w-md flex flex-col items-center">
        <Shield className="w-12 h-12 text-[#00F0FF] mb-6" />
        <h1 className="text-xl font-bold text-[#E0E2E5] mb-2 text-center uppercase tracking-widest">{isSign ? 'Create Account' : 'Login'}</h1>
        <p className="text-[10px] text-[#8E9299] mb-8 text-center font-mono uppercase">AUTHENTICATE TO ACCESS THE SHARED WORLD.</p>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {isSign && (
            <input 
              type="text" 
              placeholder="USERNAME" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] text-[#E0E2E5] p-3 rounded-sm text-xs font-mono uppercase focus:border-[#00F0FF] outline-none"
              required
            />
          )}
          <input 
            type="email" 
            placeholder="EMAIL" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#0A0B0E] border border-[#2D3139] text-[#E0E2E5] p-3 rounded-sm text-xs font-mono uppercase focus:border-[#00F0FF] outline-none"
            required
          />
          <input 
            type="password" 
            placeholder="PASSWORD" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0A0B0E] border border-[#2D3139] text-[#E0E2E5] p-3 rounded-sm text-xs font-mono focus:border-[#00F0FF] outline-none"
            required
          />
          {isSign && (
            <input 
              type="password" 
              placeholder="ADMIN SECRET (OPTIONAL)" 
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              className="w-full bg-[#0A0B0E] border border-[#2D3139] text-[#E0E2E5] p-3 rounded-sm text-xs font-mono focus:border-[#00F0FF] outline-none"
            />
          )}
          <button 
            type="submit"
            className="w-full mt-2 py-4 px-4 bg-[#0A0B0E] border border-[#2D3139] hover:border-[#00F0FF] text-[#00F0FF] text-xs font-bold tracking-widest uppercase rounded-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSign ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        
        <button 
          onClick={() => setIsSign(!isSign)}
          className="mt-6 text-[10px] font-mono tracking-widest uppercase text-[#525866] hover:text-[#00F0FF] transition-colors"
        >
          {isSign ? 'Already have an account? Login' : 'Need an account? Sign Up'}
        </button>

        <button 
          onClick={() => navigate('/')}
          className="mt-4 text-[10px] font-mono tracking-widest uppercase text-[#525866] hover:text-[#00F0FF] transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
