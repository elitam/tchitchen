'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ModifierRecette() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  
  // États (identiques à l'ajout)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'production' | 'plating'>('production')
  const [station, setStation] = useState('')
  const [baseYield, setBaseYield] = useState(1)
  const [unit, setUnit] = useState('kg')
  const [instructions, setInstructions] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState([{ item: '', qty: 0, unit: 'g' }])

  // CHARGEMENT DES DONNÉES EXISTANTES
  useEffect(() => {
    const fetchRecipe = async () => {
      const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single()
      if (data) {
        setTitle(data.title)
        setCategory(data.category)
        setStation(data.station || '')
        setBaseYield(data.base_yield)
        setUnit(data.unit)
        setInstructions(data.instructions || '')
        setImage(data.image_url)
        setIngredients(data.ingredients || [])
      }
      setFetching(false)
    }
    fetchRecipe()
  }, [id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('recipes').update({
      title, category, station, base_yield: baseYield, unit, ingredients, instructions, image_url: image
    }).eq('id', id)

    if (error) { alert(error.message); setLoading(false); } 
    else { router.push(`/recettes/${id}`); }
  }

  if (fetching) return <div className="p-10 text-zinc-800 font-black">CHARGEMENT...</div>

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-32 pt-[calc(env(safe-area-inset-top)+20px)] font-sans overflow-x-hidden">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Modifier la fiche</h1>
        <button onClick={() => router.back()} className="text-zinc-500 font-bold text-xs uppercase">Annuler</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <input required type="text" placeholder="NOM DE LA RECETTE" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent border-b border-zinc-800 py-2 text-3xl font-black uppercase outline-none focus:border-blue-500 transition-colors"
        />

        {/* PHOTO SECTION */}
        <div>
          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-4">Photo de la fiche</label>
          <label className="relative flex flex-col items-center justify-center w-full h-48 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-[2rem] overflow-hidden cursor-pointer group active:scale-95 transition-transform">
            {image ? <img src={image} className="w-full h-full object-cover" alt="" /> : <span className="text-4xl">📸</span>}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        {/* CONFIGURATION */}
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

          <div className="grid grid-cols-2 gap-4">
            <input type="number" step="0.1" value={baseYield} onFocus={(e) => e.target.select()} onChange={(e) => setBaseYield(Number(e.target.value))}
              className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-xl font-black text-blue-500"
            />
            <input type="text" placeholder="UNITÉ" value={unit} onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-xl font-black uppercase"
            />
          </div>
        </div>

        {/* INGRÉDIENTS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Mise en place</h2>
          <div className="space-y-3">
            {ingredients.map((ing, index) => (
              <div key={index} className="grid grid-cols-[1fr_75px_65px_30px] gap-2 items-center">
                <input type="text" placeholder="Item" value={ing.item} onChange={(e) => {
                  const n = [...ingredients]; n[index].item = e.target.value; setIngredients(n);
                }} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm font-bold" />
                
                <input type="number" step="0.1" value={ing.qty} onFocus={(e) => e.target.select()} onChange={(e) => {
                  const n = [...ingredients]; n[index].qty = Number(e.target.value); setIngredients(n);
                }} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-center text-blue-400 font-bold" />
                
                <input type="text" value={ing.unit} onChange={(e) => {
                  const n = [...ingredients]; n[index].unit = e.target.value; setIngredients(n);
                }} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-center font-bold" />
                
                <button type="button" onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))} className="text-zinc-800 text-xl">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setIngredients([...ingredients, { item: '', qty: 0, unit: 'g' }])}
            className="w-full py-4 border border-zinc-800 rounded-2xl text-zinc-600 text-[10px] font-black uppercase tracking-widest"
          >+ AJOUTER</button>
        </div>

        {/* PROCÉDÉ */}
        <textarea rows={6} placeholder="PROCÉDÉ..." value={instructions} onChange={(e) => setInstructions(e.target.value)}
          className="w-full bg-zinc-900 p-5 rounded-[2rem] border border-zinc-800 outline-none text-md leading-relaxed"
        />

        <button disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-blue-500/20">
          {loading ? 'MISE À JOUR...' : 'ENREGISTRER LES MODIFICATIONS'}
        </button>
      </form>
    </main>
  )
}