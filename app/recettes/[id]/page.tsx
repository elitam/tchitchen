'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'

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
        setYieldInput(data.base_yield) // On commence avec la quantité de base
      }
    }
    fetchRecipe()
  }, [id])

  if (!recipe) return <div className="p-10 text-zinc-500">Chargement...</div>

  const deleteRecipe = async () => {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer cette fiche ? Cette action est définitive.")
  
  if (confirmDelete) {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (error) {
      alert("Erreur lors de la suppression : " + error.message)
    } else {
      router.push('/recettes') // On repart à la galerie après suppression
    }
  }
}

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      {/* Barre d'actions du haut */}
<div className="flex justify-between items-center p-4">
  <button onClick={() => router.back()} className="text-zinc-400 p-2">
    ← Retour
  </button>
  
  <button 
    onClick={deleteRecipe}
    className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
  >
    <span className="text-xs font-black uppercase tracking-widest mr-2">Supprimer</span>
    🗑️
  </button>
</div>

      {/* Hero Image */}
      <div className="h-64 w-full bg-zinc-900">
        {recipe.image_url && <img src={recipe.image_url} className="w-full h-full object-cover" />}
      </div>

      <div className="p-6">
        <h1 className="text-4xl font-black mb-2 italic">{recipe.title}</h1>
        <p className="text-zinc-500 uppercase text-xs font-black tracking-widest mb-8">{recipe.station}</p>

        {/* CALCULATEUR */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl mb-8">
          <p className="text-xs font-bold text-zinc-500 uppercase mb-4">Quantité souhaitée ({recipe.unit})</p>
          <input 
            type="number" 
            value={yieldInput}
            onChange={(e) => setYieldInput(Number(e.target.value))}
            className="bg-transparent text-5xl font-black w-full outline-none text-blue-500"
          />
        </div>

        {/* INGRÉDIENTS */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Ingrédients</h2>
          <div className="space-y-3">
            {recipe.ingredients?.map((ing: any, index: number) => (
              <div key={index} className="flex justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <span className="font-medium">{ing.item}</span>
                <span className="font-mono text-blue-400">
                  {/* MATH : (Qté de base / Rendement de base) * Rendement voulu */}
                  {((ing.qty / recipe.base_yield) * yieldInput).toFixed(2)} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* INSTRUCTIONS */}
        <div>
          <h2 className="text-xl font-bold mb-4">Préparation</h2>
          <p className="text-zinc-400 leading-relaxed whitespace-pre-line">
            {recipe.instructions || "Aucune instruction saisie."}
          </p>
        </div>
      </div>
    </main>
  )
}