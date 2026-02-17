'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/context/AuthContext' // Vérifie bien ce chemin !
import { usePathname } from 'next/navigation'
import { useSearchParams } from 'next/navigation'



const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const fetcher = async () => {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, category, station, image_url')
    .order('title')
  if (error) throw error
  return data
}

export default function Recettes() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const [search, setSearch] = useState('')
  const searchParams = useSearchParams()
const tabParam = searchParams.get('tab')
// ✅ Une seule variable 'view' qui lit l'URL au démarrage
const [view, setView] = useState<'production' | 'plating'>(tabParam === 'pass' ? 'plating' : 'production')

  

  const { data: recipes, error: swrError } = useSWR('recipes_list', fetcher)

  // Filtrage ultra-sécurisé
  const filteredRecipes = (recipes || []).filter(r => {
    const matchesView = r.category === view
    const matchesSearch = (r.title || "").toLowerCase().includes(search.toLowerCase())
    return matchesView && matchesSearch
  })

  if (swrError) return <div className="p-10 text-red-500">Erreur de chargement...</div>

  return (
    <main className="min-h-screen bg-black text-white p-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-40">
  <div className="flex justify-between items-center mb-10">
    <h1 className="text-4xl font-black tracking-tighter uppercase">
      Recettes 
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
{/* TOGGLE STYLE IPHONE (Segmented Control) */}
<div className="relative bg-zinc-900/50 p-1 rounded-2xl mb-8 flex items-center border border-zinc-800/50">
  {/* Fond coulissant */}
  <motion.div
    layout
    initial={false}
    animate={{ x: view === 'production' ? '0%' : '100%' }}
    transition={{ type: "spring", stiffness: 500, damping: 40 }}
    className="absolute w-[calc(50%-4px)] h-[calc(100%-8px)] bg-zinc-700 rounded-[14px] shadow-lg"
  />
  
  <button
    onClick={() => setView('production')}
    className={`relative z-10 flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-colors duration-300 ${
      view === 'production' ? 'text-white' : 'text-zinc-500'
    }`}
  >
    La Prod
  </button>
  
  <button
    onClick={() => setView('plating')}
    className={`relative z-10 flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-colors duration-300 ${
      view === 'plating' ? 'text-white' : 'text-zinc-500'
    }`}
  >
    Le Pass
  </button>
</div>

{/* BARRE DE RECHERCHE STYLE IOS - FIX ZOOM AUTO */}
<div className="relative mb-10 group">
  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
    <svg 
      width="18" height="18" viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
      className="text-zinc-600 group-focus-within:text-blue-500 transition-colors"
    >
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  </div>
  <input
    type="text"
    placeholder="Rechercher..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    /* "text-base" est crucial ici pour éviter le zoom iOS */
    className="w-full bg-zinc-900/50 border border-zinc-800/50 p-4 pl-12 rounded-2xl text-base font-medium placeholder:text-zinc-700 outline-none focus:bg-zinc-900 focus:border-zinc-700 transition-all shadow-inner"
  />
</div>

      <div className="grid grid-cols-2 gap-4">
  <AnimatePresence>
    {filteredRecipes.map((recipe) => (
      <motion.div
        key={recipe.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link 
          href={`/recettes/${recipe.id}${view === 'plating' ? '?from=pass' : ''}`} 
          className="block bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden active:scale-95 transition-transform"
        >
          <div className="aspect-square bg-zinc-800 relative">
            {recipe.image_url ? (
              <img src={recipe.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700 text-4xl">🍲</div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-bold text-lg leading-tight mb-1">{recipe.title || 'Sans titre'}</h3>
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{recipe.station || 'Général'}</p>
          </div>
        </Link>
      </motion.div>
    ))}
  </AnimatePresence>
</div>

      {/* BOUTON + FLOTTANT STYLE IOS UNIFIÉ (Recettes) */}
{user?.role === 'admin' && (
  <Link 
    href="/recettes/ajouter" 
    className="fixed bottom-[calc(env(safe-area-inset-bottom)+130px)] right-6 w-16 h-16 rounded-full bg-zinc-100/90 backdrop-blur-md border border-white/20 shadow-lg shadow-black/30 flex items-center justify-center active:scale-95 transition-all z-40 group"
  >
    <svg 
      width="32" 
      height="32" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="black" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="group-active:scale-110 transition-transform"
    >
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  </Link>
)}

      {/* NAVBAR BASSE UNIFIÉE - VERSION TOQUE DE CHEF */}
<div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around items-center z-50 
  pt-3 pb-[calc(env(safe-area-inset-bottom)+10px)] px-6 shadow-lg shadow-black/50">
  
  {/* 1. MEP (ACCUEIL) - Icône Toque */}
  <Link href="/" className="flex flex-col items-center gap-1 group">
    <div className={`p-1 transition-all ${pathname === '/' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
        <line x1="6" y1="17" x2="18" y2="17"/>
      </svg>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/' ? 'text-white' : 'text-zinc-700'}`}>
      MEP
    </span>
  </Link>
  
  {/* 2. FICHES (RECETTES) - Icône Livre */}
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
  
  {/* 3. LOGS (HISTORIQUE) - Icône Horloge */}
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