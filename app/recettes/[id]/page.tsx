'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function FicheRecette() {
  const [isZoomed, setIsZoomed] = useState(false)
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

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-zinc-800 font-black italic">
      TCHITCHEN...
    </div>
  )

  if (!recipe) return (
    <div className="min-h-screen bg-black text-white p-10 text-center">
      <p>Recette introuvable.</p>
      <button onClick={() => router.back()} className="mt-4 text-blue-500 underline">Retour</button>
    </div>
  )

  const minYield = Math.max(0.1, (recipe.base_yield || 1) * 0.1)
  const maxYield = (recipe.base_yield || 1) * 5

  return (
    <main className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      
      {/* Header Adaptatif avec Zoom au clic */}
      <div 
        onClick={() => recipe.image_url && setIsZoomed(true)}
        className={`relative w-full transition-all duration-500 bg-zinc-900 cursor-zoom-in ${
          recipe.category === 'plating' ? 'h-[70vh]' : 'h-[40vh]'
        }`}
      >
        {recipe.image_url ? (
          <img 
            src={recipe.image_url} 
            className="w-full h-full object-cover" 
            alt={recipe.title} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🍲</div>
        )}

        {/* Dégradé */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black ${
          recipe.category === 'plating' ? 'via-black/10' : 'via-black/40'
        } to-transparent`} />
        
        {/* Boutons de navigation */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-start pt-[calc(env(safe-area-inset-top)+10px)] z-50">
          
          
          
          <Link 
  href="/recettes" 
  onClick={(e) => e.stopPropagation()} 
  className="bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10 inline-flex items-center justify-center"
>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <path d="m15 18-6-6 6-6"/>
  </svg>
</Link>
          
          <div className="flex gap-3">
            {user?.role === 'admin' && (
              <>
                <Link onClick={(e) => e.stopPropagation()} href={`/recettes/modifier/${id}`} className="bg-blue-600/80 backdrop-blur-md rounded-full p-2 shadow-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </Link>
                <button onClick={async (e) => {
                   e.stopPropagation();
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

        {/* Titre */}
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-1 drop-shadow-lg">
            {recipe.title}
          </h1>
          <p className="text-zinc-300 text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-md">
            {recipe.station || (recipe.category === 'plating' ? 'Le Pass' : 'Général')}
          </p>
        </div>
      </div>

      <div className="p-8 space-y-12">
        {/* CALCULATEUR STYLE IOS COMPACT */}
{recipe.category === 'production' && (
  <div className="flex flex-col items-center bg-zinc-900/40 py-5 px-6 rounded-[2rem] border border-zinc-800/50 shadow-inner mb-8">
    
    {/* Affichage du Chiffre - Marges réduites */}
    <div className="flex items-baseline gap-2 mb-4">
      <motion.span 
        key={yieldInput}
        initial={{ scale: 0.95, opacity: 0.9 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-5xl font-black text-blue-500 tracking-tighter"
      >
        {yieldInput.toFixed(recipe.unit === 'portion' ? 0 : 1)}
      </motion.span>
      <span className="text-lg font-black text-blue-500/40 uppercase tracking-widest">
        {recipe.unit || 'kg'}
      </span>
    </div>

    {/* Le Slider - Plus fin et épuré */}
    <div className="w-full">
      <input 
        type="range" 
        min={minYield} 
        max={maxYield} 
        step={0.1}
        value={yieldInput} 
        onChange={(e) => setYieldInput(Number(e.target.value))}
        className="ios-slider w-full h-1.5 bg-zinc-800 rounded-full appearance-none outline-none"
      />
    </div>

    {/* Style CSS Injecté */}
    <style jsx>{`
      .ios-slider::-webkit-slider-thumb {
        appearance: none;
        width: 26px;
        height: 26px;
        background: white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        border: 0.5px solid rgba(0,0,0,0.1);
        transition: transform 0.1s ease-in-out;
      }
      .ios-slider:active::-webkit-slider-thumb {
        transform: scale(1.15);
      }
      .ios-slider::-moz-range-thumb {
        width: 26px;
        height: 26px;
        background: white;
        border-radius: 50%;
        border: none;
      }
    `}</style>
  </div>
)}
       {/* INGRÉDIENTS STYLE IOS LISIBLE */}
{recipe.category === 'production' && recipe.ingredients && (
  <div className="space-y-6">
    <h2 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.3em] px-1">
      Mise en place
    </h2>
    
    <div className="space-y-2">
      {recipe.ingredients.map((ing: any, i: number) => {
        const ratio = yieldInput / (recipe.base_yield || 1)
        const calculatedQty = (ing.qty * ratio).toFixed(ing.qty * ratio < 10 ? 1 : 0)
        
        return (
          <div key={i} className="flex justify-between items-baseline bg-zinc-900/20 p-4 rounded-2xl border-b border-zinc-900/50">
            {/* Nom de l'ingrédient - Plus grand et clair */}
            <span className="text-zinc-300 font-bold text-[16px] uppercase tracking-tight">
              {ing.item}
            </span>
            
            {/* Quantité et Unité - Block compact et contrasté */}
            <div className="flex gap-1.5 items-baseline">
              <span className="text-white font-black text-2xl tracking-tighter">
                {calculatedQty}
              </span>
              <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">
                {ing.unit}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  </div>
)}

        {/* PROCÉDÉ */}
        <div className="space-y-6 pb-20">
          <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
            {recipe.category === 'plating' ? 'Composants & Dressage' : 'Procédé'}
          </h2>
          <div className="text-zinc-400 leading-relaxed text-[17px] whitespace-pre-line">
            {recipe.instructions || "Aucune instruction."}
          </div>
        </div>
      </div>

      {/* MODAL ZOOM */}
      {isZoomed && recipe.image_url && (
        <div 
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button className="absolute top-[calc(env(safe-area-inset-top)+20px)] right-6 text-white font-black uppercase text-[10px] tracking-widest bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
            Fermer
          </button>
          <img 
            src={recipe.image_url} 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            alt="Plein écran"
          />
        </div>
      )}
    </main>
  )
}