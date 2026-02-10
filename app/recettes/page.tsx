'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import useSWR from 'swr'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Le fetcher qui ne prend que le nécessaire pour les cartes
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

  // SWR remplace le useEffect et garde les données en cache
  const { data: recipes } = useSWR('recipes_list', fetcher)

  // Filtrage selon l'onglet et la recherche (on ajoute une sécurité [] si recipes est vide)
  const filteredRecipes = (recipes || []).filter(r => 
    r.category === view && 
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-32">
      <h1 className="text-4xl font-black tracking-tighter mb-8">Tchitchen</h1>

      {/* Sélecteur d'onglets */}
      <div className="flex bg-zinc-900 p-1 rounded-xl mb-6">
        <button 
          onClick={() => setView('production')}
          className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${view === 'production' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}
        >
          Production
        </button>
        <button 
          onClick={() => setView('plating')}
          className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${view === 'plating' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}
        >
          Le Pass
        </button>
      </div>

      {/* Barre de Recherche */}
      <div className="relative mb-8">
        <input 
          type="text"
          placeholder="Rechercher une recette..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-2xl outline-none focus:border-zinc-600"
        />
        <span className="absolute left-4 top-4 opacity-30 text-xl">🔍</span>
      </div>

      {/* Grille de Recettes */}
      <div className="grid grid-cols-2 gap-4">

{/* État de chargement visuel */}
        {!recipes && (
          <div className="col-span-2 py-20 text-center text-zinc-800 font-black italic animate-pulse">
            CHARGEMENT...
          </div>
        )}

        {filteredRecipes.map((recipe) => (
          <Link 
            href={`/recettes/${recipe.id}`} 
            key={recipe.id} 
            className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden active:scale-95 transition-transform"
          >
            <div className="aspect-square bg-zinc-800 relative">
              {recipe.image_url ? (
                <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-4xl">🍲</div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg leading-tight mb-1">{recipe.title}</h3>
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{recipe.station || 'Général'}</p>
            </div>
          </Link>
        ))}
      </div>

      <Link 
        href="/recettes/ajouter"
        className="fixed bottom-28 right-6 w-16 h-16 bg-white text-black rounded-full text-4xl shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        +
      </Link>

      {/* Navigation Basse */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-800 p-6 flex justify-around items-center z-50">
        <Link href="/" className="text-zinc-600 text-xs font-black tracking-widest uppercase">Accueil</Link>
        <button className="text-white text-xs font-black tracking-widest uppercase">Recettes</button>
        <button className="text-zinc-600 text-xs font-black tracking-widest uppercase opacity-50">Historique</button>
      </div>
    </main>
  )
}