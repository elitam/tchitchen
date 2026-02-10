'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import useSWR from 'swr'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Fetcher optimisé : on ne demande PAS les ingrédients ni les instructions
const fetcher = async () => {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, category, station, image_url')
    .order('title')
  if (error) throw error
  return data
}

export default function Recettes() {
  const [view, setView] = useState<'production' | 'plating'>('production')
  const [search, setSearch] = useState('')

  // SWR gère le cache et le rechargement automatique
  const { data: recipes, error, isLoading } = useSWR('recipes_list', fetcher)

  const filteredRecipes = (recipes || []).filter(r => 
    r.category === view && 
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-40 pt-[calc(env(safe-area-inset-top)+20px)] overflow-x-hidden">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black tracking-tighter italic">Tchitchen</h1>
        {isLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
      </div>

      {/* Sélecteur d'onglets */}
      <div className="flex bg-zinc-900 p-1 rounded-2xl mb-8 border border-zinc-800">
        <button onClick={() => setView('production')}
          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${view === 'production' ? 'bg-zinc-800 text-blue-400 shadow-lg' : 'text-zinc-600'}`}>
          Production
        </button>
        <button onClick={() => setView('plating')}
          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${view === 'plating' ? 'bg-zinc-800 text-blue-400 shadow-lg' : 'text-zinc-600'}`}>
          Le Pass
        </button>
      </div>

      {/* Recherche */}
      <div className="relative mb-10">
        <input type="text" placeholder="RECHERCHER..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-5 pl-14 rounded-[2rem] outline-none focus:border-blue-500/50 transition-all font-bold"
        />
        <span className="absolute left-6 top-5 opacity-20 text-xl font-bold">🔍</span>
      </div>

      {/* Grille de Recettes */}
      <div className="grid grid-cols-2 gap-6">
        {filteredRecipes.map((recipe) => (
          <Link href={`/recettes/${recipe.id}`} key={recipe.id} 
            className="group active:scale-95 transition-transform"
          >
            <div className="aspect-[4/5] bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-zinc-800 relative shadow-2xl">
              {recipe.image_url ? (
                <img src={recipe.image_url} alt="" className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🍲</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-[8px] font-black uppercase text-blue-400 tracking-[0.2em] mb-1">{recipe.station || 'Général'}</p>
                <h3 className="font-black text-sm leading-tight uppercase tracking-tight">{recipe.title}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Floating Add Button */}
      <Link href="/recettes/ajouter" className="fixed bottom-28 right-8 w-16 h-16 bg-blue-600 text-white rounded-full text-4xl shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 shadow-blue-500/40">
        +
      </Link>

      {/* Navigation Basse */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border-t border-zinc-900 p-8 flex justify-around items-center z-50">
        <Link href="/" className="text-zinc-600 text-[10px] font-black tracking-[0.2em] uppercase">Le Mur</Link>
        <button className="text-white text-[10px] font-black tracking-[0.2em] uppercase border-b-2 border-blue-500 pb-1">Recettes</button>
        <button className="text-zinc-800 text-[10px] font-black tracking-[0.2em] uppercase pointer-events-none">History</button>
      </div>
    </main>
  )
}