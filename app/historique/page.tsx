'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
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

  // ÉTATS DE FILTRAGE
  const [filterAction, setFilterAction] = useState('TOUT')
  const [filterUser, setFilterUser] = useState('TOUT')

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await supabase
          .from('audit_logs') // On garde bien ton nom de table
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        if (data) setLogs(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  // 1. EXTRAIRE LES UTILISATEURS UNIQUES POUR LES FILTRES
  const uniqueUsers = useMemo(() => {
    const users = logs.map(l => l.user_name).filter(Boolean)
    return Array.from(new Set(users))
  }, [logs])

  // 2. FILTRER LES LOGS SELON LES CHOIX
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchAction = filterAction === 'TOUT' || log.action.toUpperCase().includes(filterAction.toUpperCase())
      const matchUser = filterUser === 'TOUT' || log.user_name === filterUser
      return matchAction && matchUser
    })
  }, [logs, filterAction, filterUser])

  // 3. GROUPER PAR DATE (Seulement les logs filtrés)
  const groupedLogs = useMemo(() => {
    return filteredLogs.reduce((groups: any, log: any) => {
      const date = new Date(log.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(log)
      return groups
    }, {})
  }, [filteredLogs])

  // Petit composant de bouton filtre
  const FilterChip = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
        active ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-600 border-zinc-800'
      }`}
    >
      {label}
    </button>
  )

  return (
    <main className="min-h-screen bg-black text-white p-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-40">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
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

      {/* BLOC DE FILTRAGE */}
      <div className="space-y-6 mb-10">
        {/* FILTRE ACTIONS */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em] px-1">Actions</p>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['TOUT', 'STATUT', 'AJOUT', 'ARCHIVE'].map(a => (
              <FilterChip key={a} label={a} active={filterAction === a} onClick={() => setFilterAction(a)} />
            ))}
          </div>
        </div>

        {/* FILTRE UTILISATEURS */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em] px-1">Brigade</p>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <FilterChip label="TOUT" active={filterUser === 'TOUT'} onClick={() => setFilterUser('TOUT')} />
            {uniqueUsers.map(u => (
              <FilterChip key={u} label={u} active={filterUser === u} onClick={() => setFilterUser(u)} />
            ))}
          </div>
        </div>
      </div>

      {/* LISTE DES LOGS GROUPÉS */}
      <div className="space-y-10">
        {loading ? (
          <p className="text-zinc-800 font-black italic animate-pulse text-center py-10">CHARGEMENT...</p>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <p className="text-zinc-600 italic text-center py-20 uppercase text-[10px] tracking-widest">Aucune activité trouvée.</p>
        ) : (
          Object.keys(groupedLogs).map((date) => (
            <div key={date} className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.3em] border-b border-zinc-900 pb-2">
                {date}
              </h3>
              
              <div className="divide-y divide-zinc-900/40">
                {groupedLogs[date].map((log: any) => (
                  <div key={log.id} className="flex gap-4 items-center py-4">
                    <span className="w-8 h-8 flex items-center justify-center text-[9px] font-black text-blue-400 bg-zinc-900 rounded-lg shrink-0 border border-zinc-800 uppercase">
                      {log.user_name}
                    </span>
                    
                    <div className="flex-1 min-w-0">
  <p className="text-sm font-bold truncate">
    <span className={`uppercase mr-2 text-[9px] tracking-wider ${
      log.action.toUpperCase().includes('AJOUT') ? 'text-green-500' : 
      log.action.toUpperCase().includes('ARCHIVE') ? 'text-red-500' : 
      log.action.toUpperCase().includes('STATUT') ? 'text-blue-500' : 'text-zinc-500'
    }`}>
      {log.action}
    </span>
    {log.target_name}
  </p>
</div>

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

      {/* NAVBAR BASSE */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around items-center z-50 pt-3 pb-[calc(env(safe-area-inset-bottom)+10px)] px-6">
        <Link href="/" className="flex flex-col items-center gap-1 group">
          <div className={`p-1 ${pathname === '/' ? 'text-blue-500' : 'text-zinc-600'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
          </div>
          <span className="text-[9px] font-black uppercase">MEP</span>
        </Link>
        <Link href="/recettes" className="flex flex-col items-center gap-1 group">
          <div className={`p-1 ${pathname.includes('/recettes') ? 'text-blue-500' : 'text-zinc-600'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <span className="text-[9px] font-black uppercase">Fiches</span>
        </Link>
        <Link href="/historique" className="flex flex-col items-center gap-1 group">
          <div className={`p-1 ${pathname === '/historique' ? 'text-blue-500' : 'text-zinc-600'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <span className="text-[9px] font-black uppercase">Logs</span>
        </Link>
      </div>
    </main>
  )
}