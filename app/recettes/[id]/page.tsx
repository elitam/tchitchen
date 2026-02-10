'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function FicheRecette() {
  const params = useParams()
  const id = params?.id
  const router = useRouter()
  const { user } = useAuth()
  
  const [recipe, setRecipe] = useState<any>(null)
  const [yieldInput, setYieldInput] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const fetchRecipe = async () => {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single()
        
        if (data) {
          setRecipe(data)
          setYieldInput(data.base_yield || 1)
        }
      } catch (err) {
        console.error("Erreur de chargement", err)
      } finally {
        setLoading(false)
      }
    }
    fetchRecipe()
  }, [id])

  // État de chargement propre
  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-zinc-800 font-black italic">
      TCHITCHEN...
    </div>
  )

  // Si pas de recette trouvée
  if (!recipe) return (
    <div className="min-h-screen bg-black text-white p-10 text-center">
      <p>Recette introuvable.</p>
      <button onClick={() => router.back()} className="mt-4 text-blue-500 underline">Retour</button>
    </div>
  )

  // Bornes du slider
  const minYield = Math.max(0.1, (recipe.base_yield || 1) * 0.1)
  const maxYield = (recipe.base_yield || 1) * 5

  return (
    <main className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* Header avec Image */}
      <div className="relative w-full h-[40vh] bg-zinc-900">
        {recipe.image_url && (
          <img src={recipe.image_url} className="w-full h-full object-cover" alt="" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        
        {/* Navigation bar */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-start pt-[calc(env(safe-area-inset-top)+10px)] z-50">
          <button onClick={() => router.back()} className="bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          
          <div className="flex gap-3">
            {/* On vérifie si l'user est ADMIN avant d'afficher les boutons modif/suppr */}
            {user?.role === 'admin' && (
              <>
                <Link href={`/recettes/modifier/${id}`} className="bg-blue-600/80 backdrop-blur-md rounded-full p-2 shadow-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </Link>
                <button onClick={async () => {
                   if(confirm('Supprimer cette fiche ?')) {
                     await supabase.from('recipes').delete().eq('id', id)
                     router.push('/recettes')
                   }
                }} className="bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-1">{recipe.title || 'Sans titre'}</h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">{recipe.station || 'Général'}</p>
        </div>
      </div>

      <div className="p-8 space-y-12">
        {/* CALCULATEUR (Seulement pour Production) */}
        {recipe.category === 'production' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-blue-500 tracking-tighter">
                {yieldInput.toFixed(recipe.unit === 'portion' ? 0 : 1)}
              </span>
              <span className="text-xl font-black text-blue-500/50 uppercase">{recipe.unit || 'kg'}</span>
            </div>
            <input type="range" min={minYield} max={maxYield} step={0.1}
              value={yieldInput} onChange={(e) => setYieldInput(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        )}

        {/* INGRÉDIENTS (Seulement pour Production) */}
        {recipe.category === 'production' && recipe.ingredients && (
          <div className="space-y-6">
            <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Mise en place</h2>
            <div className="space-y-4">
              {recipe.ingredients.map((ing: any, i: number) => {
                const ratio = yieldInput / (recipe.base_yield || 1)
                const calculatedQty = (ing.qty * ratio).toFixed(ing.qty * ratio < 10 ? 1 : 0)
                return (
                  <div key={i} className="flex justify-between items-end border-b border-zinc-900 pb-2">
                    <span className="text-zinc-400 font-bold uppercase text-sm">{ing.item}</span>
                    <div className="flex gap-1 items-baseline">
                      <span className="text-white font-black">{calculatedQty}</span>
                      <span className="text-zinc-600 text-[10px] font-bold lowercase">{ing.unit}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PROCÉDÉ / COMPOSANTS */}
        <div className="space-y-6 pb-20">
          <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
            {recipe.category === 'plating' ? 'Composants & Dressage' : 'Procédé'}
          </h2>
          <div className="text-zinc-400 leading-relaxed text-[17px] whitespace-pre-line">
            {recipe.instructions || "Aucune instruction."}
          </div>
        </div>
      </div>
    </main>
  )
}