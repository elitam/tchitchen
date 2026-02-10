'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/context/AuthContext'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_LABELS: Record<string, string> = {
  'pending': 'À faire',
  'in_progress': 'En cours',
  'completed': 'Terminé'
}

export default function Home() {
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [allRecipes, setAllRecipes] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)

// 1. Charger les recettes de production au démarrage
useEffect(() => {
  const fetchRecipes = async () => {
    const { data } = await supabase
      .from('recipes')
      .select('id, title, category')
      .eq('category', 'production') // On exclut le "plating" comme demandé
    if (data) setAllRecipes(data)
  }
  fetchRecipes()
}, [])

// 2. Gérer la saisie et les suggestions
const handleInputChange = (val: string) => {
  setNewTaskName(val)
  if (val.length > 1) {
    const filtered = allRecipes.filter(r => 
      r.title.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 4) // On limite à 4 suggestions pour rester compact
    setSuggestions(filtered)
  } else {
    setSuggestions([])
  }
}

  // Logique de tri (In Progress en premier, Terminé à la fin)
  const sortTasks = (list: any[]) => {
    const priority: Record<string, number> = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
    return [...list].sort((a, b) => priority[a.status] - priority[b.status]);
  };

  useEffect(() => {
    const fetchTasks = async () => {
      const { data } = await supabase.from('tasks').select('*')
      if (data) setTasks(sortTasks(data))
    }
    fetchTasks()
  }, [])

  // 1. AJOUTER UNE TÂCHE + LOG
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskName.trim()) return
    
    const { data } = await supabase
    .from('tasks')
    .insert([{ 
      display_name: newTaskName, 
      status: 'pending',
      recipe_id: selectedRecipeId // On ajoute le lien ici
    }])
    .select()

    if (data) {
      setTasks(sortTasks([data[0], ...tasks]))
      
      // Audit Log
      await supabase.from('audit_logs').insert([{
        user_name: user?.initials,
        action: 'AJOUT TÂCHE',
        target_name: newTaskName
      }])

      setNewTaskName('')
      setIsModalOpen(false)
    }
  }

  // 2. CHANGER LE STATUT + LOG (Initiales dans l'historique)
  const toggleStatus = async (id: string, currentStatus: string, taskName: string) => {
    const statusOrder = ['pending', 'in_progress', 'completed']
    const nextStatus = statusOrder[(statusOrder.indexOf(currentStatus) + 1) % statusOrder.length]

    // Update Visuel
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, status: nextStatus } : t)
    setTasks(sortTasks(updatedTasks))

    // Update DB
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', id)

    // Audit Log
    await supabase.from('audit_logs').insert([{
      user_name: user?.initials,
      action: 'STATUT',
      target_name: `${taskName} (${STATUS_LABELS[nextStatus]})`
    }])
  }

  // 3. ARCHIVER DÉFINITIVEMENT (Bouton X) + LOG
  const deleteTask = async (id: string, taskName: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id))
      
      // Audit Log
      await supabase.from('audit_logs').insert([{
        user_name: user?.initials,
        action: 'ARCHIVE',
        target_name: taskName
      }])
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-32">
      
      {/* 1. HEADER UNIFIÉ */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black tracking-tighter uppercase">Tchitchen</h1>
        <button 
          onClick={() => { if(confirm("Se déconnecter ?")) logout() }}
          className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 active:scale-90 transition-transform"
        >
           <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">
             {user?.initials || '..'}
           </span>
        </button>
      </div>

      {/* 2. LISTE DES TÂCHES (MUR) */}
      <div className="space-y-6">
        <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Mise en place du jour</h2>
        
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group w-full flex items-center p-5 border rounded-[2rem] transition-all duration-300 ${
                  task.status === 'in_progress' ? 'bg-blue-600/10 border-blue-500/40' : 
                  task.status === 'completed' ? 'bg-zinc-900/30 border-zinc-900 opacity-40' : 
                  'bg-zinc-900/50 border-zinc-800'
                }`}
              >
                {/* Zone cliquable pour changer le statut */}
                <div className="flex-1 cursor-pointer" onClick={() => toggleStatus(task.id, task.status, task.display_name)}>
                  <div className="flex items-center gap-3">
                    <p className={`text-lg font-bold tracking-tight ${task.status === 'completed' ? 'line-through text-zinc-600' : 'text-white'}`}>
                      {task.display_name}
                    </p>
                    
                    {/* ICÔNE DE LIEN VERS LA FICHE RECETTE */}
                    {task.recipe_id && (
                      <Link 
                        href={`/recettes/${task.recipe_id}`}
                        onClick={(e) => e.stopPropagation()} // Empêche de cocher la tâche par erreur
                        className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 active:scale-75 transition-transform"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                      </Link>
                    )}
                  </div>
                  <p className={`text-[9px] font-black uppercase mt-1 tracking-widest ${
                    task.status === 'in_progress' ? 'text-blue-400' : 'text-zinc-600'
                  }`}>
                    {STATUS_LABELS[task.status]}
                  </p>
                </div>

                {/* Bouton Archiver (X) */}
                <button 
                  onClick={() => { if(confirm(`Archiver "${task.display_name}" ?`)) deleteTask(task.id, task.display_name) }}
                  className="ml-4 p-3 text-zinc-800 active:text-red-500 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. BOUTON FLOTTANT AJOUTER (+) */}
      <button 
        onClick={() => setIsModalOpen(true)} 
        className="fixed bottom-28 right-6 w-16 h-16 bg-white text-black rounded-full text-4xl font-light shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40"
      > + </button>
      
      {/* 4. MODAL D'AJOUT AVEC SUGGESTIONS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative">
            <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Nouvelle tâche</h2>
            
            <form onSubmit={addTask}>
              <div className="relative mb-8">
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="Ex: Sauce hollandaise..." 
                  value={newTaskName} 
                  onChange={(e) => handleInputChange(e.target.value)} 
                  className="w-full bg-zinc-800 border border-zinc-700 p-5 rounded-2xl text-white outline-none focus:border-blue-500 transition-colors text-base" 
                />

                {/* DROPDOWN DES SUGGESTIONS */}
                {suggestions.length > 0 && (
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 bg-zinc-900/50 text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-700">
                      Recettes de production
                    </div>
                    {suggestions.map(recipe => (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => {
                          setNewTaskName(recipe.title);
                          setSelectedRecipeId(recipe.id);
                          setSuggestions([]);
                        }}
                        className="w-full p-4 text-left hover:bg-zinc-700 active:bg-zinc-600 border-b border-zinc-700/50 last:border-0 flex items-center justify-between"
                      >
                        <span className="text-sm font-bold text-white">{recipe.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 px-2 py-1 rounded uppercase tracking-tighter">Lier fiche</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-500"><path d="m9 18 6-6-6-6"/></svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setSuggestions([]);
                    setSelectedRecipeId(null);
                  }} 
                  className="flex-1 p-4 rounded-xl font-bold text-zinc-500 active:text-white"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-white text-black p-4 rounded-xl font-black uppercase text-xs tracking-widest active:scale-95 transition-transform"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. NAVBAR BASSE UNIFIÉE */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-800 p-6 flex justify-around items-center z-50">
        <button className="text-white text-xs font-black tracking-widest uppercase">Accueil</button>
        <Link href="/recettes" className="text-zinc-600 text-xs font-black tracking-widest uppercase">Recettes</Link>
        <Link href="/historique" className="text-zinc-600 text-xs font-black tracking-widest uppercase">Historique</Link>
      </div>
    </main>
  );
}