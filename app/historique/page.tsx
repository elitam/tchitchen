'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { usePathname } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function HistoriquePage() {
    const pathname = usePathname()
  const { user, logout } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(60)

        if (data) setLogs(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  // --- LOGIQUE DE GROUPEMENT (Placée ici pour éviter le trait rouge) ---
  const groupedLogs = logs.reduce((groups: any, log: any) => {
    const date = new Date(log.created_at).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(log)
    return groups
  }, {})

  return (
    <main className="min-h-screen bg-black text-white p-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-40">
      
      {/* HEADER UNIFIÉ */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black tracking-tighter uppercase">Historique</h1>
        <button 
          onClick={() => { if(confirm("Se déconnecter ?")) logout() }}
          className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 active:scale-90 transition-transform"
        >
           <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">
             {user?.initials || '..'}
           </span>
        </button>
      </div>

      <div className="space-y-10">
        {loading ? (
          <p className="text-zinc-800 font-black italic animate-pulse text-center py-10">CHARGEMENT...</p>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <p className="text-zinc-600 italic text-center py-10">Aucune activité enregistrée.</p>
        ) : (
          Object.keys(groupedLogs).map((date) => (
            <div key={date} className="space-y-4">
              {/* Séparateur de Date */}
              <h3 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] border-b border-zinc-900 pb-2">
                {date}
              </h3>
              
              <div className="divide-y divide-zinc-900/50">
                {groupedLogs[date].map((log: any) => (
                  <div key={log.id} className="flex gap-4 items-center py-4">
                    {/* Badge Utilisateur */}
                    <span className="w-8 h-8 flex items-center justify-center text-[9px] font-black text-blue-400 bg-zinc-900 rounded-lg shrink-0 border border-zinc-800 uppercase">
                      {log.user_name}
                    </span>
                    
                    {/* Infos Action */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">
                        <span className="text-zinc-500 uppercase mr-2 text-[10px] tracking-wider">{log.action}</span>
                        {log.target_name}
                      </p>
                    </div>

                    {/* Heure */}
                    <span className="text-[10px] font-bold text-zinc-800 tabular-nums">
                      {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

     {/* NAVBAR BASSE UNIFIÉE - FINALE (MEP / FICHES / LOGS) */}
<div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around items-center z-50 
  pt-3 pb-[calc(env(safe-area-inset-bottom)+10px)] px-6">
  
  {/* MEP (Mise En Place) - Nouvelle icône Fouet */}
  <Link href="/" className="flex flex-col items-center gap-1 group">
    <div className={`p-1 transition-all ${pathname === '/' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
      {/* Icône Fouet */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 22h14"/><path d="m5 2h14"/><path d="M17 22v-4.135c0-1.613-1.28-2.938-2.886-3.016A4.99 4.99 0 0 1 12 10V2"/><path d="M7 22v-4.135c0-1.613 1.28-2.938 2.886-3.016A4.99 4.99 0 0 0 12 10V2"/>
      </svg>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/' ? 'text-white' : 'text-zinc-700'}`}>
      MEP
    </span>
  </Link>
  
  {/* FICHES (Recettes) - Icône Livre */}
  <Link href="/recettes" className="flex flex-col items-center gap-1 group">
    <div className={`p-1 transition-all ${pathname.includes('/recettes') ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${pathname.includes('/recettes') ? 'text-white' : 'text-zinc-700'}`}>
      Fiches
    </span>
  </Link>
  
  {/* LOGS (Historique) - Icône Horloge */}
  <Link href="/historique" className="flex flex-col items-center gap-1 group">
    <div className={`p-1 transition-all ${pathname === '/historique' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
      </svg>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/historique' ? 'text-white' : 'text-zinc-700'}`}>
      Logs
    </span>
  </Link>
</div>
    </main>
  )
}