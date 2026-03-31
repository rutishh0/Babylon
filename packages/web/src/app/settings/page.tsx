'use client';

import { useState, useEffect } from 'react';
import { Settings, HardDrive, Server, Wifi, FolderOpen, RefreshCw } from 'lucide-react';

interface SystemInfo {
  apiHealth: boolean;
  animeHealth: boolean;
  webHealth: boolean;
  mediaPath: string;
  lanIp: string;
}

export default function SettingsPage() {
  const [info, setInfo] = useState<SystemInfo>({
    apiHealth: false,
    animeHealth: false,
    webHealth: false,
    mediaPath: 'B:\\Babylon\\media',
    lanIp: '',
  });
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    const [api, anime] = await Promise.all([
      fetch('/api/anime/library').then(() => true).catch(() => false),
      fetch('http://localhost:3000/api/health').then(r => r.ok).catch(() => false),
    ]);
    setInfo(prev => ({ ...prev, apiHealth: api, animeHealth: anime, webHealth: true }));
    setChecking(false);
  };

  useEffect(() => { checkHealth(); }, []);

  return (
    <div className="max-w-screen-lg mx-auto px-4 md:px-8 py-8">
      <h1 className="text-white text-3xl font-bold mb-8 flex items-center gap-3">
        <Settings className="w-8 h-8 text-[#F47521]" />
        Settings
      </h1>

      {/* Service Status */}
      <div className="bg-[#141519] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <Server className="w-5 h-5 text-[#a0a0a0]" />
            Service Status
          </h2>
          <button
            onClick={checkHealth}
            disabled={checking}
            className="text-[#F47521] hover:text-white text-sm flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Babylon API', port: 3000, ok: info.apiHealth },
            { name: 'Anime Server', port: 5000, ok: info.animeHealth },
            { name: 'Web Frontend', port: 3001, ok: info.webHealth },
          ].map(s => (
            <div key={s.name} className="flex items-center justify-between py-2 border-b border-[#23252b] last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${s.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-white text-sm">{s.name}</span>
              </div>
              <span className="text-[#a0a0a0] text-sm">Port {s.port} — {s.ok ? 'Online' : 'Offline'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Storage */}
      <div className="bg-[#141519] rounded-lg p-6 mb-6">
        <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-[#a0a0a0]" />
          Storage
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#23252b]">
            <span className="text-[#a0a0a0] text-sm">Media Path</span>
            <span className="text-white text-sm font-mono">{info.mediaPath}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#23252b]">
            <span className="text-[#a0a0a0] text-sm">Database</span>
            <span className="text-white text-sm font-mono">B:\Babylon\data\phase15.db</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#a0a0a0] text-sm">Downloads Temp</span>
            <span className="text-white text-sm font-mono">B:\Babylon\downloads\</span>
          </div>
        </div>
      </div>

      {/* Network */}
      <div className="bg-[#141519] rounded-lg p-6 mb-6">
        <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-[#a0a0a0]" />
          Network
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#23252b]">
            <span className="text-[#a0a0a0] text-sm">LAN Access</span>
            <span className="text-white text-sm font-mono">http://192.168.1.140:3001</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#23252b]">
            <span className="text-[#a0a0a0] text-sm">API Endpoint</span>
            <span className="text-white text-sm font-mono">http://192.168.1.140:3000/api</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#a0a0a0] text-sm">Anime Server</span>
            <span className="text-white text-sm font-mono">http://192.168.1.140:5000/api</span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-[#141519] rounded-lg p-6">
        <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-[#a0a0a0]" />
          About
        </h2>
        <div className="space-y-2">
          <p className="text-[#a0a0a0] text-sm">Babylon — Personal Anime Streaming Platform</p>
          <p className="text-[#a0a0a0] text-sm">Phase 2: Local Alienware Hosting</p>
          <p className="text-[#a0a0a0] text-sm">Sources: AllAnime (search + streaming)</p>
        </div>
      </div>
    </div>
  );
}
