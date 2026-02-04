'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function FicheRecette() {
  const { id } = useParams()
  const router = useRouter()
  const [recipe, setRecipe] = useState<any>(null)
  const [yieldInput, setYieldInput] = useState<number>(1)

  useEffect(() => {
    const fetchRecipe = async () => {
      const { data } = await supabase.from('recipes').select('*').eq('id', id).single()
      if (data) {
        setRecipe(data)
        setYieldInput(data.base_yield)
      }
    }
    fetchRecipe()
  }, [id])

  if (!recipe) return <div className="p-10 text-zinc-800 font-black italic">TCHITCHEN...</div>

  const deleteRecipe = async () => {
    if (confirm("Supprimer la fiche ?")) {
      await supabase.from('recipes').delete().eq('id', id)
      router.push('/recettes')
    }
  }

  const minYield = Math.max(0.1, recipe.base_yield * 0.1)
  const maxYield = recipe.base_yield * 5

  return (
    <main className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      <style jsx global>{`
        input[type='range'] { -webkit-appearance: none; background: transparent; }
        input[type='range']::-webkit-slider-runnable-track { width: 100%; height: 2px; background: #1e1e1e; }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; height: 18px; width: 18px; border-radius: 50%;
          background: #3b82f6; cursor: pointer; margin-top: -8px; 
          border: 3px solid black; box-shadow: 0 0 0 1px #3b82f6;
        }
        .dotted-line { flex-grow: 1; border-bottom: 2px dotted #27272a; margin: 0 8px 6px 8px; }
      `}</style>
  {/* Image Header */}
  <div className="relative w-full h-[35vh] bg-zinc-900">
    {recipe.image_url && <img src={recipe.image_url} className="w-full h-full object-cover" alt="" />}
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
    
    {/* BARRE D'ACTIONS - C'est ici que ça se passe */}
    <div className="absolute top-0 w-full p-6 flex justify-between items-start pt-[calc(env(safe-area-inset-top)+10px)] z-50">
      {/* Retour */}
      <button onClick={() => router.back()} className="bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      
      {/* Groupe d'actions à droite */}
      <div className="flex gap-3">
        {/* BOUTON MODIFIER (Crayon) */}
        <Link 
          href={`/recettes/modifier/${id}`} 
          className="bg-blue-600/80 backdrop-blur-md rounded-full p-2 border border-blue-400/20 shadow-lg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </Link>

        {/* BOUTON SUPPRIMER (Poubelle) */}
        <button 
          onClick={deleteRecipe} 
          className="bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10 opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    </div>

    {/* Titre & Station */}
    <div className="absolute bottom-6 left-6 right-6">
      <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-1">{recipe.title}</h1>
      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">{recipe.station || 'GENERAL'}</p>
    </div>
  </div>
<div className="p-8 space-y-12">
  
  {/* ON AFFICHE LE CALCULATEUR UNIQUEMENT POUR LA PRODUCTION */}
  {recipe.category === 'production' && (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-black text-blue-500 tracking-tighter">
          {yieldInput.toFixed(recipe.unit === 'portion' ? 0 : 1)}
        </span>
        <span className="text-xl font-black text-blue-500/50 uppercase">{recipe.unit}</span>
      </div>
      <input type="range" min={minYield} max={maxYield} step={recipe.unit === 'portion' ? 1 : 0.1}
        value={yieldInput} onChange={(e) => setYieldInput(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )}

  {/* ON AFFICHE LA MISE EN PLACE UNIQUEMENT POUR LA PRODUCTION */}
  {recipe.category === 'production' && (
    <div className="space-y-6">
      <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Mise en place</h2>
      {/* ... (ton code de liste d'ingrédients avec pointillés) */}
    </div>
  )}

  {/* PROCÉDÉ (PRODUCTION) OU COMPOSANTS (PASS) */}
  <div className="space-y-6 pb-20">
  <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
    {recipe.category === 'plating' ? 'Composants & Dressage' : 'Procédé'}
  </h2>
  <div className="text-zinc-400 leading-relaxed text-[17px] whitespace-pre-line">
    {recipe.instructions || <span className="opacity-30 italic">Aucune instruction.</span>}
  </div>
</div>
</div>
      
      
    </main>
  )
}