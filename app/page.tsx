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

  const longPressTriggered = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: recs } = await supabase.from('recipes').select('id, title, category').eq('category', 'production')
      if (recs) setAllRecipes(recs)
      const { data: tks } = await supabase.from('tasks').select('*')
      if (tks) setTasks(sortTasks(tks))
      const saved = localStorage.getItem('tchitchen_shopping_checks')
      if (saved) setCheckedItems(JSON.parse(saved))
    }
    fetchData()
  }, [])

  useEffect(() => {
    localStorage.setItem('tchitchen_shopping_checks', JSON.stringify(checkedItems))
  }, [checkedItems])

  const sortTasks = (list: any[]) => {
    const priority: Record<string, number> = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
    return [...list].sort((a, b) => {
      if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
      return (a.is_optional ? 1 : 0) - (b.is_optional ? 1 : 0);
    });
  };

  // --- ACTIONS ---

  const togglePriority = async (id: string, currentOptional: boolean, taskName: string) => {
    const nextOptional = !currentOptional
    setTasks(prev => sortTasks(prev.map(t => t.id === id ? { ...t, is_optional: nextOptional } : t)))
    await supabase.from('tasks').update({ is_optional: nextOptional }).eq('id', id)
    await supabase.from('audit_logs').insert([{ user_name: user?.initials, action: 'PRIORITÉ', target_name: `${taskName} (${nextOptional ? 'Optionnel' : 'Obligatoire'})` }])
  }

  const toggleStatus = async (id: string, currentStatus: string, taskName: string) => {
    const statusOrder = ['pending', 'in_progress', 'completed']
    const nextStatus = statusOrder[(statusOrder.indexOf(currentStatus) + 1) % statusOrder.length]
    setTasks(prev => sortTasks(prev.map(t => t.id === id ? { ...t, status: nextStatus } : t)))
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', id)
  }

  const deleteTask = async (id: string, taskName: string) => {
    if (!confirm(`Archiver "${taskName}" ?`)) return
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id))
      await supabase.from('audit_logs').insert([{ user_name: user?.initials, action: 'ARCHIVE', target_name: taskName }])
    }
  }

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newTaskName.trim()
    if (!name) return
    if (tasks.some(t => t.display_name.toLowerCase().trim() === name.toLowerCase())) {
      setDuplicateError(true); 
      setTimeout(() => setDuplicateError(false), 3000); 
      return
    }
    const { data } = await supabase.from('tasks').insert([{ display_name: name, status: 'pending', recipe_id: selectedRecipeId }]).select()
    if (data) {
      setTasks(sortTasks([data[0], ...tasks]))
      setNewTaskName(''); 
      setSelectedRecipeId(null); 
      setIsModalOpen(false)
    }
  }

  // --- LOGIQUE GESTES ---
  const handlePointerDown = (task: any) => {
    longPressTriggered.current = false
    timerRef.current = setTimeout(() => {
      togglePriority(task.id, task.is_optional, task.display_name)
      longPressTriggered.current = true
      if (navigator.vibrate) navigator.vibrate(40)
    }, 500)
  }

  const handlePointerUp = (task: any) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!longPressTriggered.current) {
      toggleStatus(task.id, task.status, task.display_name)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-40">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">Tchitchen</h1>
        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
           <span className="text-[10px] font-black text-blue-400 uppercase">{user?.initials || '..'}</span>
        </div>
      </div>

      {/* MISE EN PLACE */}
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Mise en place</h2>
          <button onClick={async () => {
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
          }} className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-zinc-500">Réassort</button>
        </div>
        
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  layout: { 
                    type: "tween", 
                    ease: [0.4, 0, 0.2, 1], 
                    duration: 0.18 
                  }
                }}
                onPointerDown={() => handlePointerDown(task)}
                onPointerUp={() => handlePointerUp(task)}
                onPointerCancel={() => { if (timerRef.current) clearTimeout(timerRef.current) }}
                style={{ WebkitTouchCallout: 'none', userSelect: 'none', touchAction: 'pan-y' }} 
                className={`w-full flex items-center p-5 border rounded-3xl transition-all select-none ${
                  task.status === 'in_progress' ? 'bg-blue-600/10 border-blue-500/50' : 
                  task.status === 'completed' ? 'bg-zinc-900/30 border-zinc-900 opacity-40' : 
                  'bg-zinc-900 border-zinc-800'
                } ${task.is_optional ? 'border-dashed opacity-50' : 'border-solid opacity-100'}`}
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
                {/* BOUTON SUPPRIMER (RÉINTRODUIT) */}
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id, task.display_name); }} 
                  className="ml-4 p-2 text-zinc-800 hover:text-red-500"
                > ✕ </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* BOUTON + */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-32 right-6 w-16 h-16 rounded-full bg-white text-black shadow-2xl flex items-center justify-center active:scale-90 z-40 transition-transform">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
      </button>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
           <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm p-8 rounded-[2.5rem] relative">
              <h2 className="text-xl font-black mb-6 uppercase tracking-tighter italic text-zinc-500">Nouvelle Tâche</h2>
              <form onSubmit={addTask}>
                <input autoFocus type="text" value={newTaskName} onChange={(e) => {
                  setNewTaskName(e.target.value);
                  if (e.target.value.length > 1) {
                    setSuggestions(allRecipes.filter(r => r.title.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 4))
                  } else setSuggestions([])
                }} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl text-white outline-none focus:border-blue-500 mb-4" />
                
                {suggestions.length > 0 && (
                  <div className="bg-zinc-800 rounded-xl overflow-hidden mb-4">
                    {suggestions.map(r => (
                      <button key={r.id} type="button" onClick={() => { setNewTaskName(r.title); setSelectedRecipeId(r.id); setSuggestions([]); }} className="w-full p-3 text-left border-b border-zinc-700 text-sm font-bold">{r.title}</button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 font-bold text-zinc-600">Fermer</button>
                  <button type="submit" className="flex-1 bg-white text-black p-4 rounded-xl font-black uppercase text-xs">Ajouter</button>
                </div>
              </form>
           </div>
        </div>
      )}

      {/* NAVBAR BASSE */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-900 flex justify-around items-center pt-3 pb-8 px-6">
        <Link href="/" className="flex flex-col items-center gap-1 opacity-100"><div className="text-blue-500"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><span className="text-[8px] font-black uppercase tracking-[0.2em]">MEP</span></Link>
        <Link href="/recettes" className="flex flex-col items-center gap-1 opacity-40"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span className="text-[8px] font-black uppercase tracking-[0.2em]">Fiches</span></Link>
        <Link href="/historique" className="flex flex-col items-center gap-1 opacity-40"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span className="text-[8px] font-black uppercase tracking-[0.2em]">Logs</span></Link>
      </div>

    </main>
  );
}