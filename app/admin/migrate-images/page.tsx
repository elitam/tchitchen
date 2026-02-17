'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import imageCompression from 'browser-image-compression'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function MigrateImagesPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [recipes, setRecipes] = useState<any[]>([])
  const [isMigrating, setIsMigrating] = useState(false)
  const [currentStep, setCurrentStep] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [logs, setLogs] = useState<string[]>([])

  // Sécurité : Seul un admin peut accéder à cette page
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/')
    }
  }, [user, router])

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
  }

  const startMigration = async () => {
    if (!confirm("Voulez-vous vraiment lancer la compression de TOUTES les images existantes ? Cela peut prendre quelques minutes.")) return

    setIsMigrating(true)
    addLog("Début de la migration...")

    // 1. Récupérer toutes les recettes qui ont une image
    const { data: allRecipes, error } = await supabase
      .from('recipes')
      .select('id, title, image_url')
      .not('image_url', 'is', null)

    if (error || !allRecipes) {
      addLog("Erreur lors de la récupération des recettes.")
      setIsMigrating(false)
      return
    }

    const recipesToProcess = allRecipes.filter(r => r.image_url && r.image_url.includes('supabase.co'))
    setProgress({ current: 0, total: recipesToProcess.length })
    addLog(`${recipesToProcess.length} images à traiter.`)

    for (let i = 0; i < recipesToProcess.length; i++) {
      const recipe = recipesToProcess[i]
      setCurrentStep(`Traitement de : ${recipe.title}`)
      
      try {
        // 2. Télécharger l'image actuelle
        const response = await fetch(recipe.image_url)
        const blob = await response.blob()
        
        // Vérifier si l'image est déjà petite (optionnel)
        if (blob.size < 1024 * 300) { // Si < 300 Ko, on passe
          addLog(`Saut de ${recipe.title} (déjà optimisée : ${(blob.size / 1024).toFixed(0)} Ko)`)
          setProgress(prev => ({ ...prev, current: i + 1 }))
          continue
        }

        const originalFile = new File([blob], "temp.jpg", { type: "image/jpeg" })

        // 3. Compresser l'image
        const options = {
          maxSizeMB: 0.7, // On vise ~700 Ko
          maxWidthOrHeight: 1200,
          useWebWorker: true
        }
        
        const compressedBlob = await imageCompression(originalFile, options)
        
        // 4. Uploader la nouvelle version vers Supabase
        // On crée un nouveau nom pour éviter les problèmes de cache navigateur
        const fileExt = "jpg"
        const fileName = `opt_${recipe.id}_${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('photos-recettes')
          .upload(fileName, compressedBlob)

        if (uploadError) throw uploadError

        // 5. Récupérer l'URL publique
        const { data: publicUrlData } = supabase.storage
          .from('photos-recettes')
          .getPublicUrl(fileName)

        // 6. Mettre à jour la base de données
        const { error: updateError } = await supabase
          .from('recipes')
          .update({ image_url: publicUrlData.publicUrl })
          .eq('id', recipe.id)

        if (updateError) throw updateError

        addLog(`✅ ${recipe.title} optimisée (${(blob.size / 1024).toFixed(0)} Ko -> ${(compressedBlob.size / 1024).toFixed(0)} Ko)`)

      } catch (err: any) {
        addLog(`❌ Erreur sur ${recipe.title} : ${err.message}`)
      }

      setProgress(prev => ({ ...prev, current: i + 1 }))
    }

    setIsMigrating(false)
    setCurrentStep("Migration terminée !")
    addLog("Migration terminée avec succès.")
  }

  if (!user || user.role !== 'admin') return null

  return (
    <main className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Maintenance Photos</h1>
        <p className="text-zinc-500 text-sm mb-8 uppercase font-bold tracking-widest">Compression massive des images (Moteur de nettoyage)</p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 mb-8">
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">{isMigrating ? '⚙️' : '📸'}</div>
            <h2 className="text-xl font-bold mb-4">Optimiser le stockage</h2>
            <p className="text-zinc-400 text-sm mb-8">
              Ce script va parcourir toutes vos recettes, télécharger les photos de 5-6 Mo, les compresser à moins de 800 Ko, et mettre à jour les fiches automatiquement.
            </p>

            {isMigrating ? (
              <div className="w-full space-y-4">
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs font-black text-blue-400 uppercase tracking-widest animate-pulse">
                  {currentStep}
                </p>
                <p className="text-zinc-600 text-[10px] font-bold">
                  {progress.current} / {progress.total} RECETTES TRAITÉES
                </p>
              </div>
            ) : (
              <button 
                onClick={startMigration}
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-transform"
              >
                Lancer la migration
              </button>
            )}
          </div>
        </div>

        {/* LOGS */}
        <div className="bg-black border border-zinc-900 rounded-2xl p-6 h-64 overflow-y-auto flex flex-col-reverse gap-2">
          {logs.length === 0 && <p className="text-zinc-800 italic text-center text-xs uppercase">En attente de lancement...</p>}
          {logs.map((log, i) => (
            <p key={i} className="text-[10px] font-mono text-zinc-500 border-b border-zinc-900 pb-1">
              {log}
            </p>
          ))}
        </div>
      </div>
    </main>
  )
}