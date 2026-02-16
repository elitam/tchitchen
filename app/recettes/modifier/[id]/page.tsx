'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useSearchParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ModifierRecette() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const searchParams = useSearchParams()
  const from = searchParams.get('from') // Récupère le contexte (home, pass, etc.)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'production' | 'plating'>('production')
  const [station, setStation] = useState('')
  const [baseYield, setBaseYield] = useState(1)
  const [unit, setUnit] = useState('kg')
  const [instructions, setInstructions] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState([{ item: '', qty: 0, unit: 'g' }])

  useEffect(() => {
    if (!id) return
    const fetchRecipe = async () => {
      const { data } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        setTitle(data.title)
        setCategory(data.category || 'production')
        setStation(data.station || '')
        setBaseYield(data.base_yield || 1)
        setUnit(data.unit || 'kg')
        setInstructions(data.instructions || '')
        setImage(data.image_url)
        setIngredients(data.ingredients || [])
      }
      setFetching(false)
    }
    fetchRecipe()
  }, [id])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('photos-recettes')
      .upload(fileName, file)

    if (uploadError) {
      alert("Erreur upload: " + uploadError.message)
      setLoading(false)
      return
    }
    const { data } = supabase.storage.from('photos-recettes').getPublicUrl(fileName)
    setImage(data.publicUrl)
    setLoading(false)
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    const newIngs = [...ingredients]
    newIngs[index] = { ...newIngs[index], [field]: value }
    setIngredients(newIngs)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('recipes')
      .update({
        title,
        category,
        station,
        base_yield: category === 'production' ? baseYield : 1,
        unit: category === 'production' ? unit : 'fiche',
        ingredients: category === 'production' ? ingredients : [],
        instructions,
        image_url: image
      })
      .eq('id', id)

    if (error) {
      alert("Erreur: " + error.message)
      setLoading(false)
    } else {
      // Redirection après succès en gardant le contexte 'from'
      const nextPath = `/recettes/${id}${from ? `?from=${from}` : ''}`
      router.replace(nextPath)
    }
  }

  if (fetching) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-zinc-800 font-black italic animate-pulse">CHARGEMENT...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-32 pt-[calc(env(safe-area-inset-top)+20px)] font-sans overflow-x-hidden">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black tracking-tighter uppercase text-zinc-500">Modifier</h1>
        <button 
          type="button"
          onClick={() => {
            // Annulation en gardant le contexte 'from'
            const backPath = `/recettes/${id}${from ? `?from=${from}` : ''}`
            router.replace(backPath)
          }} 
          className="text-zinc-500 font-bold text-xs uppercase underline underline-offset-4"
        >
          Annuler
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <input 
          required 
          type="text" 
          value={title} 
          onFocus={(e) => e.target.select()}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="on"
          autoCorrect="on"
          spellCheck="true"
          className="w-full bg-transparent border-b border-zinc-900 py-2 text-3xl font-black outline-none focus:border-blue-500 transition-colors"
          placeholder="Nom de la recette"
        />

        <div>
          <label className="relative flex flex-col items-center justify-center w-full h-56 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-[2rem] overflow-hidden cursor-pointer active:scale-95 transition-transform">
            {image ? (
              <img src={image} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-4xl">{loading ? '⌛' : '📸'}</span>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={loading} />
          </label>
        </div>

        <div className="space-y-6">
          <select 
            value={category} 
            onChange={(e:any) => setCategory(e.target.value)}
            className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-sm font-bold appearance-none text-blue-400"
          >
            <option value="production">📦 PRODUCTION</option>
            <option value="plating">🍽️ LE PASS / DRESSAGE</option>
          </select>
          
          <input 
            type="text" placeholder="STATION" value={station} 
            onFocus={(e) => e.target.select()}
            onChange={(e) => setStation(e.target.value)}
            className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-sm font-bold uppercase"
          />

          {category === 'production' && (
            <div className="grid grid-cols-2 gap-4">
              <input 
                type="number" step="0.5" value={baseYield} 
                onFocus={(e) => e.target.select()} 
                onChange={(e) => setBaseYield(Number(e.target.value))}
                className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-xl font-black text-blue-500"
              />
              <input 
                type="text" placeholder="UNITÉ" value={unit} 
                onFocus={(e) => e.target.select()}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 outline-none text-xl font-black uppercase text-zinc-400"
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Mise en place</h2>
          <div className="space-y-3">
            {ingredients.map((ing, index) => (
              <div 
                key={index} 
                className="grid grid-cols-[1fr_65px_55px_25px] gap-2 items-center"
              >
                <input 
                  type="text" 
                  placeholder="Item" 
                  value={ing.item} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                  autoComplete="on" autoCorrect="on"
                  className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm font-bold min-w-0" 
                />
                
                <input 
                  type="number" 
                  step="0.5" 
                  value={ing.qty} 
                  onFocus={(e) => e.target.select()} 
                  onChange={(e) => updateIngredient(index, 'qty', Number(e.target.value))}
                  className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-center text-blue-400 font-bold" 
                />
                
                <input 
                  type="text" 
                  value={ing.unit} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-center font-bold lowercase" 
                />
                
                <button 
                  type="button" 
                  onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))} 
                  className="text-zinc-700 hover:text-red-500 transition-colors flex justify-center items-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          <button 
            type="button" 
            onClick={() => setIngredients([...ingredients, { item: '', qty: 0, unit: 'g' }])}
            className="w-full py-4 border border-zinc-800 rounded-2xl text-zinc-700 text-[10px] font-black uppercase tracking-widest active:bg-zinc-900"
          >
            + Ajouter un ingrédient
          </button>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] block">
            {category === 'plating' ? 'Composants du dressage' : 'Procédé de fabrication'}
          </label>
          <textarea rows={10} placeholder="..." value={instructions} onChange={(e) => setInstructions(e.target.value)}
            className="w-full bg-zinc-900 p-5 rounded-[2rem] border border-zinc-800 outline-none text-md leading-relaxed"
          />
        </div>

        <button disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest active:scale-95 transition-transform shadow-xl shadow-blue-500/20 disabled:opacity-50">
          {loading ? 'SYNCHRONISATION...' : 'METTRE À JOUR LA FICHE'}
        </button>
      </form>
    </main>
  )
}