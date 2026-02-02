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
  
  // États du formulaire
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('production')
  const [station, setStation] = useState('')
  const [baseYield, setBaseYield] = useState(1)
  const [unit, setUnit] = useState('kg')
  const [instructions, setInstructions] = useState('')
  const [ingredients, setIngredients] = useState([{ item: '', qty: 0, unit: 'g' }])
  const [imageFile, setImageFile] = useState<File | null>(null)

  // Gérer les ingrédients (ajouter une ligne)
  const addIngredientRow = () => {
    setIngredients([...ingredients, { item: '', qty: 0, unit: 'g' }])
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    setIngredients(newIngredients)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let imageUrl = ''

      // 1. Upload de l'image si elle existe
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('photos-recettes')
          .upload(fileName, imageFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('photos-recettes')
          .getPublicUrl(fileName)
        
        imageUrl = urlData.publicUrl
      }

      // 2. Insertion de la recette
      const { error } = await supabase.from('recipes').insert([{
        title,
        category,
        station,
        base_yield: baseYield,
        unit,
        instructions,
        ingredients,
        image_url: imageUrl
      }])

      if (error) throw error
      router.push('/recettes')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-20 font-sans">
      <button onClick={() => router.back()} className="mb-6 text-zinc-500">← Annuler</button>
      <h1 className="text-3xl font-black mb-8 italic">Nouvelle Fiche</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Photo */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-zinc-500">Photo du plat</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full bg-zinc-900 p-4 rounded-2xl border border-dashed border-zinc-700"
          />
        </div>

        {/* Infos de base */}
        <div className="grid grid-cols-1 gap-4">
          <input type="text" placeholder="Nom de la recette" value={title} onChange={e => setTitle(e.target.value)} required className="bg-zinc-900 p-4 rounded-xl outline-none border border-zinc-800 focus:border-white" />
          
          <div className="flex gap-2">
            <select value={category} onChange={e => setCategory(e.target.value)} className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <option value="production">Production</option>
              <option value="plating">Le Pass</option>
            </select>
            <input type="text" placeholder="Poste (ex: Saucier)" value={station} onChange={e => setStation(e.target.value)} className="flex-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800" />
          </div>
        </div>

        {/* Rendement */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Rendement de base</label>
            <input type="number" value={baseYield} onChange={e => setBaseYield(Number(e.target.value))} className="w-full bg-zinc-900 p-4 rounded-xl border border-zinc-800" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase text-zinc-500 ml-2">Unité (kg, L...)</label>
            <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-zinc-900 p-4 rounded-xl border border-zinc-800" />
          </div>
        </div>

        {/* Ingrédients dynamiques */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase text-zinc-500 tracking-widest">Ingrédients</h2>
          {ingredients.map((ing, index) => (
            <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-left-2">
              <input type="text" placeholder="Item" value={ing.item} onChange={e => updateIngredient(index, 'item', e.target.value)} className="flex-[2] bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-sm" />
              <input type="number" placeholder="Qté" value={ing.qty} onChange={e => updateIngredient(index, 'qty', Number(e.target.value))} className="flex-1 bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-sm" />
              <input type="text" placeholder="Unité" value={ing.unit} onChange={e => updateIngredient(index, 'unit', e.target.value)} className="w-16 bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-sm" />
            </div>
          ))}
          <button type="button" onClick={addIngredientRow} className="w-full py-3 border border-dashed border-zinc-700 rounded-xl text-zinc-500 text-xs font-bold">+ Ajouter une ligne</button>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-zinc-500">Instructions (Texte simple)</label>
          <textarea 
            rows={6}
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Étape 1...&#10;Étape 2..."
            className="w-full bg-zinc-900 p-4 rounded-xl border border-zinc-800 outline-none focus:border-white"
          />
        </div>

        {/* Bouton Enregistrer */}
        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-white text-black p-6 rounded-2xl font-black text-xl active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'CRÉER LA FICHE'}
        </button>
      </form>
    </main>
  )
}