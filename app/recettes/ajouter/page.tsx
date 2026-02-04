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
  
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'production' | 'plating'>('production')
  const [station, setStation] = useState('')
  const [baseYield, setBaseYield] = useState(1)
  const [unit, setUnit] = useState('kg')
  const [instructions, setInstructions] = useState('')
  const [image, setImage] = useState<string | null>(null) // Stockage Base64
  
  const [ingredients, setIngredients] = useState([{ item: '', qty: 0, unit: 'g' }])

  // Fonction pour transformer la photo en texte (Base64)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngs = [...ingredients]
    newIngs[index] = { ...newIngs[index], [field]: value }
    setIngredients(newIngs)
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
      image_url: image // On sauve le texte de l'image
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

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* TITRE */}
        <input 
          required
          type="text" placeholder="NOM DE LA RECETTE" 
          value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent border-b border-zinc-800 py-2 text-3xl font-black uppercase outline-none focus:border-blue-500 transition-colors"
        />

        {/* AJOUT PHOTO (Juste après le titre) */}
        <div>
          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-4">Photo de la fiche</label>
          <label className="relative flex flex-col items-center justify-center w-full h-48 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-[2rem] overflow-hidden cursor-pointer group active:scale-95 transition-transform">
            {image ? (
              <img src={image} className="w-full h-full object-cover" alt="Preview" />
            ) : (
              <div className="text-center">
                <span className="text-4xl mb-2 block">📸</span>
                <span className="text-[10px] font-black uppercase text-zinc-500">Choisir dans la galerie</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        {/* CONFIGURATION - Champs dynamiques */}
<div className="space-y-6">
  <select value={category} onChange={(e:any) => setCategory(e.target.value)}
    className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-sm font-bold appearance-none"
  >
    <option value="production">📦 PRODUCTION</option>
    <option value="plating">🍽️ LE PASS / DRESSAGE</option>
  </select>
  
  <input type="text" placeholder="STATION" value={station} onChange={(e) => setStation(e.target.value)}
    className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-sm font-bold uppercase"
  />

  {/* ON CACHE SI C'EST LE PASS */}
  {category === 'production' && (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-[10px] font-black text-zinc-600 uppercase mb-2 block">Rendement base</label>
        <input type="number" step="0.1" value={baseYield} onFocus={(e) => e.target.select()} onChange={(e) => setBaseYield(Number(e.target.value))}
          className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-xl font-black text-blue-500"
        />
      </div>
      <div>
        <label className="text-[10px] font-black text-zinc-600 uppercase mb-2 block">Unité</label>
        <input type="text" placeholder="kg, L..." value={unit} onChange={(e) => setUnit(e.target.value)}
          className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-xl font-black uppercase"
        />
      </div>
    </div>
  )}
</div>

{/* INGRÉDIENTS - CACHÉ SI C'EST LE PASS */}
{category === 'production' && (
  <div className="space-y-4">
    <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Mise en place</h2>
    <div className="space-y-3">
            {ingredients.map((ing, index) => (
              <div key={index} className="grid grid-cols-[1fr_75px_65px_30px] gap-2 items-center">
                <input 
                  type="text" placeholder="Item" value={ing.item}
                  onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                  className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm font-bold"
                />
                <input 
                  type="number" step="0.1" value={ing.qty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateIngredient(index, 'qty', Number(e.target.value))}
                  className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-center text-blue-400 font-bold"
                />
                <input 
                  type="text" placeholder="Unité" value={ing.unit}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-center font-bold lowercase"
                />
                <button type="button" onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))} className="text-zinc-800">✕</button>
              </div>
            ))}
          </div>
          <button 
            type="button" onClick={() => setIngredients([...ingredients, { item: '', qty: 0, unit: 'g' }])}
            className="w-full py-4 border border-zinc-800 rounded-2xl text-zinc-600 text-[10px] font-black uppercase tracking-widest"
          >
            + Ajouter
          </button>
  </div>
)}

{/* PROCÉDÉ / COMPOSANTS - Texte libre */}
<div className="space-y-4">
  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] block">
    {category === 'plating' ? 'Composants du dressage' : 'Procédé de fabrication'}
  </label>
  <textarea rows={6} placeholder={category === 'plating' ? 'Ex: 1. Purée de céleri, 2. Jus corsé...' : 'Étapes...'} 
    value={instructions} onChange={(e) => setInstructions(e.target.value)}
    className="w-full bg-zinc-900 p-5 rounded-[2rem] border border-zinc-800 outline-none text-md leading-relaxed"
  />
</div>

        <button 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-blue-500/20"
        >
          {loading ? 'SYNCHRONISATION...' : 'ENREGISTRER LA FICHE'}
        </button>
      </form>
    </main>
  )
}