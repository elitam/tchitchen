'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AjouterRecette() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // État de la recette
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'production' | 'plating'>('production')
  const [station, setStation] = useState('')
  const [baseYield, setBaseYield] = useState(1)
  const [unit, setUnit] = useState('kg')
  const [instructions, setInstructions] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  
  // État des ingrédients
  const [ingredients, setIngredients] = useState([
    { item: '', qty: 0, unit: 'g' }
  ])

  const addIngredient = () => {
    setIngredients([...ingredients, { item: '', qty: 0, unit: 'g' }])
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngs = [...ingredients]
    newIngs[index] = { ...newIngs[index], [field]: value }
    setIngredients(newIngs)
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('recipes').insert([{
      title,
      category,
      station,
      base_yield: baseYield,
      unit,
      ingredients,
      instructions,
      image_url: imageUrl
    }])

    if (error) {
      alert("Erreur: " + error.message)
      setLoading(false)
    } else {
      router.push('/recettes')
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-32 pt-[calc(env(safe-area-inset-top)+20px)] font-sans overflow-x-hidden">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Nouvelle Fiche</h1>
        <button onClick={() => router.back()} className="text-zinc-500 font-bold text-xs uppercase">Annuler</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* INFOS DE BASE */}
        <div className="space-y-4">
          <input 
            required
            type="text" placeholder="Nom de la recette..." 
            value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-b border-zinc-800 py-4 text-2xl font-bold outline-none focus:border-blue-500 transition-colors"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Catégorie</label>
              <select 
                value={category} onChange={(e:any) => setCategory(e.target.value)}
                className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm"
              >
                <option value="production">Production</option>
                <option value="plating">Le Pass</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Station</label>
              <input 
                type="text" placeholder="Ex: Saucier" 
                value={station} onChange={(e) => setStation(e.target.value)}
                className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Rendement de base</label>
              <input 
                type="number" step="0.1"
                value={baseYield} 
                onFocus={(e) => e.target.select()} // Focus Auto-select
                onChange={(e) => setBaseYield(Number(e.target.value))}
                className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-blue-500 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Unité</label>
              <input 
                type="text" placeholder="kg, L, portion..." 
                value={unit} onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* INGRÉDIENTS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Ingrédients</h2>
          
          <div className="space-y-3">
            {ingredients.map((ing, index) => (
              <div key={index} className="grid grid-cols-[1fr_70px_60px_30px] gap-2 items-center">
                <input 
                  type="text" placeholder="Item" value={ing.item}
                  onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                  className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm"
                />
                <input 
                  type="number" step="0.1" placeholder="Qté" value={ing.qty}
                  onFocus={(e) => e.target.select()} // Focus Auto-select
                  onChange={(e) => updateIngredient(index, 'qty', Number(e.target.value))}
                  className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-center text-blue-400 font-bold"
                />
                <input 
                  type="text" placeholder="Unité" value={ing.unit}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-center"
                />
                <button 
                  type="button" onClick={() => removeIngredient(index)}
                  className="text-zinc-700 hover:text-red-500 text-lg"
                >✕</button>
              </div>
            ))}
          </div>
          
          <button 
            type="button" onClick={addIngredient}
            className="w-full py-3 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-bold uppercase"
          >
            + Ajouter un ingrédient
          </button>
        </div>

        {/* INSTRUCTIONS & IMAGE */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] block">Procédé</label>
          <textarea 
            rows={5} placeholder="Étapes de préparation..." 
            value={instructions} onChange={(e) => setInstructions(e.target.value)}
            className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-sm leading-relaxed"
          />
          
          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] block">URL Image</label>
          <input 
            type="text" placeholder="https://..." 
            value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            className="w-full bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm"
          />
        </div>

        <button 
          disabled={loading}
          className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Sauvegarder la fiche'}
        </button>
      </form>
    </main>
  )
}