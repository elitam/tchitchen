'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import useSWR from 'swr'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const fetcher = async () => {
  const { data, error } = await supabase
    .from('logs') // Assure-toi que ta table s'appelle 'logs'
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export default function Historique() {
  const pathname = usePathname()
  const { data: logs, error } = useSWR('logs_list', fetcher)
  
  // ÉTATS DE FILTRAGE
  const [filterAction, setFilterAction] = useState('TOUT')
  const [filterUser, setFilterUser] = useState('TOUT')

  if (error) return <div className="p-10 text-red-500">Erreur de chargement...</div>

  // 1. EXTRACTION DYNAMIQUE DES UTILISATEURS PRÉSENTS DANS LES LOGS
  const uniqueUsers = Array.from(new Set((logs || []).map(l => l.user_initials))).filter(Boolean)

  // 2. LOGIQUE DE FILTRAGE
  const filteredLogs = (logs || []).filter(log => {
    const matchAction = filterAction === 'TOUT' || log.action_type === filterAction
    const matchUser = filterUser === 'TOUT' || log.user_initials === filterUser
    return matchAction && matchUser
  })

  // Composant petit bouton filtre (Chip)
  const FilterChip = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
        active 
        ? 'bg-white text-black border-white shadow-lg' 
        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
      }`}
    >
      {label}
    </button>
  )

  return (
    <main className="min-h-screen bg-black text-white p-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-40">
      <h1 className="text-4xl font-black tracking-tighter uppercase mb-8">Logs</h1>

      {/* BLOC DE FILTRAGE */}
      <div className="space-y-6 mb-10">
        
        {/* FILTRE ACTIONS */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Actions</p>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['TOUT', 'STATUS', 'AJOUT', 'ARCHIVE'].map(a => (
              <FilterChip 
                key={a} 
                label={a} 
                active={filterAction === a} 
                onClick={() => setFilterAction(a)} 
              />
            ))}
          </div>
        </div>

        {/* FILTRE UTILISATEURS */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-1">Utilisateurs</p>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <FilterChip 
              label="TOUT" 
              active={filterUser === 'TOUT'} 
              onClick={() => setFilterUser('TOUT')} 
            />
            {uniqueUsers.map(user => (
              <FilterChip 
                key={user} 
                label={user} 
                active={filterUser === user} 
                onClick={() => setFilterUser(user)} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* LISTE DES LOGS */}
      <div className="space-y-3">
        <AnimatePresence mode='popLayout'>
          {filteredLogs.map((log) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={log.id}
              className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl flex justify-between items-center"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${
                    log.action_type === 'AJOUT' ? 'bg-green-500/20 text-green-500' :
                    log.action_type === 'ARCHIVE' ? 'bg-red-500/20 text-red-500' :
                    'bg-blue-500/20 text-blue-500'
                  }`}>
                    {log.action_type}
                  </span>
                  <span className="text-zinc-500 text-[10px] font-medium">
                    {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm font-bold text-zinc-200">{log.description}</p>
              </div>
              
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <span className="text-[10px] font-black text-zinc-400">{log.user_initials}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLogs.length === 0 && (
          <p className="text-center text-zinc-600 text-xs font-bold py-20 uppercase tracking-widest">
            Aucun log trouvé
          </p>
        )}
      </div>

      {/* NAVBAR BASSE (Identique aux autres pages) */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around items-center z-50 pt-3 pb-[calc(env(safe-area-inset-bottom)+10px)] px-6 shadow-lg shadow-black/50">
        <Link href="/" className="flex flex-col items-center gap-1 group">
          <div className={`p-1 transition-all ${pathname === '/' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/>
            </svg>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/' ? 'text-white' : 'text-zinc-700'}`}>MEP</span>
        </Link>
        <Link href="/recettes" className="flex flex-col items-center gap-1 group">
          <div className={`p-1 transition-all ${pathname.includes('/recettes') ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${pathname.includes('/recettes') ? 'text-white' : 'text-zinc-700'}`}>Fiches</span>
        </Link>
        <Link href="/historique" className="flex flex-col items-center gap-1 group">
          <div className={`p-1 transition-all ${pathname === '/historique' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/historique' ? 'text-white' : 'text-zinc-700'}`}>Logs</span>
        </Link>
      </div>
    </main>
  )
}