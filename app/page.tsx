'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/app/context/AuthContext'
import { usePathname } from 'next/navigation'

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
  const pathname = usePathname()
  
  // ÉTATS
  const [tasks, setTasks] = useState<any[]>([])
  const [duplicateError, setDuplicateError] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [allRecipes, setAllRecipes] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false)
  const [shoppingList, setShoppingList] = useState<any[]>([])
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  // REFS POUR GESTION GESTES (LONG PRESS)
  const longPressTriggered = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. CHARGEMENT INITIAL
  useEffect(() => {
    const fetchInitialData = async () => {
      // Recettes
      const { data: recData } = await supabase.from('recipes').select('id, title, category').eq('category', 'production')
      if (recData) setAllRecipes(recData)
      
      // Tâches
      const { data: taskData } = await supabase.from('tasks').select('*')
      if (taskData) setTasks(sortTasks(taskData))
      
      // Shopping List Checks
      const savedChecks = localStorage.getItem('tchitchen_shopping_checks')
      if (savedChecks) setCheckedItems(JSON.parse(savedChecks))
    }
    fetchInitialData()
  }, [])

  useEffect(() => {
    localStorage.setItem('tchitchen_shopping_checks', JSON.stringify(checkedItems))
  }, [checkedItems])

  // LOGIQUE DE TRI
  const sortTasks = (list: any[]) => {
    const priority: Record<string, number> = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
    return [...list].sort((a, b) => {
      if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
      return (a.is_optional ? 1 : 0) - (b.is_optional ? 1 : 0);
    });
  };

  // ACTIONS TÂCHES
  const toggleStatus = async (id: string, currentStatus: string, taskName: string) => {
    const statusOrder = ['pending', 'in_progress', 'completed']
    const nextStatus = statusOrder[(statusOrder.indexOf(currentStatus) + 1) % statusOrder.length]
    setTasks(prev => sortTasks(prev.map(t => t.id === id ? { ...t, status: nextStatus } : t)))
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', id)
    await supabase.from('audit_logs').insert([{ user_name: user?.initials, action: 'STATUT', target_name: `${taskName} (${STATUS_LABELS[nextStatus]})` }])
  }

  const togglePriority = async (id: string, currentOptional: boolean, taskName: string) => {
    const nextOptional = !currentOptional
    setTasks(prev => sortTasks(prev.map(t => t.id === id ? { ...t, is_optional: nextOptional } : t)))
    await supabase.from('tasks').update({ is_optional: nextOptional }).eq('id', id)
    await supabase.from('audit_logs').insert([{ user_name: user?.initials, action: 'PRIORITÉ', target_name: `${taskName} (${nextOptional ? 'Optionnel' : 'Obligatoire'})` }])
  }

  const deleteTask = async (id: string, taskName: string) => {
    if (!confirm(`Archiver "${taskName}" ?`)) return
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id))
      await supabase.from('audit_logs').insert([{ user_name: user?.initials, action: 'ARCHIVE', target_name: taskName }])
    }
  }

  // GESTIONNAIRE DE GESTES (POINTER)
  const handlePointerDown = (task: any) => {
  longPressTriggered.current = false
  timerRef.current = setTimeout(() => {
    togglePriority(task.id, task.is_optional, task.display_name)
    
    // VIBRATION RÉACTIVÉE ICI
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40) 
    }
    
    longPressTriggered.current = true
  }, 500)
}

  const handlePointerUp = (task: any) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!longPressTriggered.current) {
      toggleStatus(task.id, task.status, task.display_name)
    }
  }

  // FONCTIONS ANNEXES (Shopping, Input)
  const toggleCheck = (item: string, unit: string) => {
    const key = `${item}-${unit}`.toLowerCase()
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleInputChange = (val: string) => {
    setNewTaskName(val)
    setDuplicateError(false)
    setSelectedRecipeId(null)
    if (val.length > 1) {
      setSuggestions(allRecipes.filter(r => r.title.toLowerCase().includes(val.toLowerCase())).slice(0, 4))
    } else setSuggestions([])
  }

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newTaskName.trim()
    if (!name) return
    if (tasks.some(t => t.display_name.toLowerCase().trim() === name.toLowerCase())) {
      setDuplicateError(true); setTimeout(() => setDuplicateError(false), 3000); return
    }
    const { data } = await supabase.from('tasks').insert([{ display_name: name, status: 'pending', recipe_id: selectedRecipeId }]).select()
    if (data) {
      setTasks(sortTasks([data[0], ...tasks]))
      setNewTaskName(''); setSelectedRecipeId(null); setIsModalOpen(false)
    }
  }

  const generateShoppingList = async () => {
    const ids = tasks.filter(t => t.status === 'in_progress' && t.recipe_id).map(t => t.recipe_id)
    if (ids.length === 0) return
    const { data } = await supabase.from('recipes').select('ingredients').in('id', ids)
    if (!data) return
    const aggregated: Record<string, any> = {}
    data.forEach(r => r.ingredients?.forEach((ing: any) => {
      const key = `${ing.item}-${ing.unit}`.toLowerCase()
      if (aggregated[key]) aggregated[key].qty += Number(ing.qty)
      else aggregated[key] = { ...ing, qty: Number(ing.qty) }
    }))
    setShoppingList(Object.values(aggregated)); setIsShoppingListOpen(true)
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-40">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black tracking-tighter uppercase">Tchitchen</h1>
        <button onClick={() => { if(confirm("Se déconnecter ?")) logout() }} className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 active:scale-90">
           <span className="text-[10px] font-black text-blue-400 uppercase">{user?.initials || '..'}</span>
        </button>
      </div>

      {/* MISE EN PLACE */}
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Mise en place</h2>
          <button onClick={generateShoppingList} disabled={!tasks.some(t => t.status === 'in_progress' && t.recipe_id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${tasks.some(t => t.status === 'in_progress' && t.recipe_id) ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-700 opacity-50'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 7H4M20 12H4M20 17H4"/></svg>
            <span className="text-[10px] font-black uppercase">Réassort</span>
          </button>
        </div>
        
        <div className="space-y-3">
  <AnimatePresence mode="popLayout">
    {tasks.map((task) => (
      <motion.div 
  key={task.id}
  layout
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  
  // ANIMATION LINÉAIRE ET RAPIDE (Celle d'avant)
  transition={{ 
    layout: { duration: 0.2, ease: "linear" }, // Mouvement direct sans rebond
    opacity: { duration: 0.2 } 
  }}
  
  onPointerDown={() => handlePointerDown(task)}
  onPointerUp={() => handlePointerUp(task)}
  onPointerCancel={() => { if (timerRef.current) clearTimeout(timerRef.current) }}
  
  style={{ WebkitTouchCallout: 'none', userSelect: 'none' }} 
  className={`group w-full flex items-center p-5 border rounded-3xl transition-all select-none ${
    task.status === 'in_progress' ? 'bg-blue-600/10 border-blue-500/50' : 
    task.status === 'completed' ? 'bg-zinc-900/30 border-zinc-900 opacity-40' : 
    'bg-zinc-900 border-zinc-800'
  } ${task.is_optional ? 'border-dashed opacity-50 scale-[0.98]' : 'border-solid opacity-100'}`}
>
  <div className="flex-1">
    <div className="flex items-center gap-3">
      <p className={`text-xl font-bold ${task.status === 'completed' ? 'line-through text-zinc-600' : 'text-white'}`}>
        {task.display_name}
      </p>
      {task.recipe_id && (
        <Link href={`/recettes/${task.recipe_id}`} onClick={(e) => e.stopPropagation()} className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        </Link>
      )}
    </div>
    <p className={`text-[10px] font-black uppercase mt-1 ${task.status === 'in_progress' ? 'text-blue-400' : 'text-zinc-500'}`}>
      {STATUS_LABELS[task.status]} {task.is_optional && "• Optionnel"}
    </p>
  </div>
  
  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id, task.display_name); }} className="ml-4 p-2 text-zinc-800 hover:text-red-500"> ✕ </button>
</motion.div>
    ))}
  </AnimatePresence>
</div>
      </div>

      {/* BOUTON + */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-[calc(env(safe-area-inset-bottom)+130px)] right-6 w-16 h-16 rounded-full bg-zinc-100/90 backdrop-blur-md border border-white/20 shadow-lg shadow-black/30 flex items-center justify-center active:scale-95 transition-all z-40 group">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black group-active:scale-110 transition-transform">
          <path d="M5 12h14"/><path d="M12 5v14"/>
        </svg>
      </button>
      
      {/* MODAL AJOUT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative">
            <h2 className="text-2xl font-black mb-6 uppercase">Nouvelle tâche</h2>
            <form onSubmit={addTask}>
              <div className="relative mb-6">
                <input autoFocus type="text" placeholder="Ex: Tailler..." value={newTaskName} onChange={(e) => handleInputChange(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 p-5 rounded-2xl text-white outline-none focus:border-blue-500 text-base" />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl z-[110]">
                    {suggestions.map(recipe => (
                      <button key={recipe.id} type="button" onClick={() => { setNewTaskName(recipe.title); setSelectedRecipeId(recipe.id); setSuggestions([]); }} className="w-full p-4 text-left hover:bg-zinc-700 border-b border-zinc-700 last:border-0 flex justify-between items-center">
                        <span className="text-sm font-bold text-white">{recipe.title}</span>
                        <span className="text-[9px] font-black text-blue-400 uppercase">Lier</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {duplicateError && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-[10px] font-black uppercase mb-4 tracking-widest text-center">Déjà dans la liste</motion.div>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 font-bold text-zinc-500">Annuler</button>
                <button type="submit" className="flex-1 bg-white text-black p-4 rounded-xl font-black uppercase text-xs">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVBAR BASSE */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around items-center z-50 pt-3 pb-[calc(env(safe-area-inset-bottom)+10px)] px-6 shadow-lg shadow-black/50">
        <Link href="/" className="flex flex-col items-center gap-1">
          <div className={`p-1 ${pathname === '/' ? 'text-blue-500' : 'text-zinc-600'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">MEP</span>
        </Link>
        <Link href="/recettes" className="flex flex-col items-center gap-1">
          <div className={`p-1 ${pathname.includes('/recettes') ? 'text-blue-500' : 'text-zinc-600'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Fiches</span>
        </Link>
        <Link href="/historique" className="flex flex-col items-center gap-1">
          <div className={`p-1 ${pathname === '/historique' ? 'text-blue-500' : 'text-zinc-600'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Logs</span>
        </Link>
      </div>

      {/* DRAWER SHOPPING LIST */}
      <AnimatePresence>
        {isShoppingListOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsShoppingListOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-[2.5rem] z-[160] max-h-[80vh] overflow-y-auto pb-10 shadow-2xl">
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mt-4 mb-8" />
              <div className="px-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black uppercase tracking-tight">Réassort</h3>
                  <button onClick={() => setIsShoppingListOpen(false)} className="text-zinc-500 font-bold">OK</button>
                </div>
                <div className="space-y-3">
                  {shoppingList.map((ing, i) => {
                    const key = `${ing.item}-${ing.unit}`.toLowerCase();
                    const isChecked = checkedItems[key];
                    return (
                      <div key={i} onClick={() => toggleCheck(ing.item, ing.unit)} className={`flex justify-between items-center p-5 rounded-2xl border transition-all active:scale-95 cursor-pointer ${isChecked ? 'bg-zinc-900 border-zinc-800 opacity-30' : 'bg-zinc-800 border-zinc-700'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-zinc-600'}`}>
                            {isChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>}
                          </div>
                          <span className={`font-bold uppercase text-sm ${isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{ing.item}</span>
                        </div>
                        <div className="flex gap-2 items-baseline">
                          <span className={`font-black text-xl ${isChecked ? 'text-zinc-600' : 'text-white'}`}>{ing.qty}</span>
                          <span className="text-zinc-500 text-[10px] font-black uppercase">{ing.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}