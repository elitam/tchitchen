'use client'
// Cette ligne empêche l'erreur de "prerendering" sur Vercel
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ON UTILISE "export default" CLAIREMENT ICI
export default function HistoriquePage() {
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
          .limit(40)

        if (data) setLogs(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-32 pt-[calc(env(safe-area-inset-top)+20px)]">
      <div className="flex justify-between items-center mb-10">
    <h1 className="text-4xl font-black tracking-tighter uppercase">
      {/* Change le nom ici selon la page : Tchitchen, Recettes ou Historique */}
      Historique 
    </h1>
    
    <button 
      onClick={() => { if(confirm("Se déconnecter ?")) logout() }}
      className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 active:scale-90 transition-transform"
    >
       <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">
         {user?.initials || '..'}
       </span>
    </button>
  </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-zinc-800 font-black italic animate-pulse text-center py-10">CHARGEMENT...</p>
        ) : logs.length === 0 ? (
          <p className="text-zinc-600 italic text-center py-10">Aucune activité.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-4 items-start py-4 border-b border-zinc-900">
              <span className="text-[9px] font-black text-zinc-500 bg-zinc-900 px-2 py-1 rounded shrink-0 border border-zinc-800">
                {log.user_name}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold leading-tight">
                  <span className="text-blue-500 uppercase mr-2">{log.action}</span>
                  {log.target_name}
                </p>
                <p className="text-[9px] text-zinc-700 font-bold uppercase mt-1 tracking-widest">
                  {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {new Date(log.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Navigation Basse */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-800 p-6 flex justify-around items-center z-50">
        <Link href="/" className="text-zinc-600 text-xs font-black tracking-widest uppercase">Accueil</Link>
        <Link href="/recettes" className="text-zinc-600 text-xs font-black tracking-widest uppercase">Recettes</Link>
        <button className="text-white text-xs font-black tracking-widest uppercase border-b-2 border-blue-500 pb-1">Historique</button>
      </div>
    </main>
  )
}