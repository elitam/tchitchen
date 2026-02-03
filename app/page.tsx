'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Reorder } from 'framer-motion'

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
  const [tasks, setTasks] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('position', { ascending: true })

      if (error) {
        console.error("Erreur de chargement des tâches:", error.message)
      } else {
        setTasks(data || [])
      }
    }
    fetchTasks()
  }, [])

  const toggleStatus = async (id: string, currentStatus: string) => {
    const statusOrder = ['pending', 'in_progress', 'completed']
    const nextIndex = (statusOrder.indexOf(currentStatus) + 1) % statusOrder.length
    const nextStatus = statusOrder[nextIndex]

    const { error } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', id)

    if (error) setErrorMsg(error.message)
    else {
      setTasks(tasks.map(t => t.id === id ? { ...t, status: nextStatus } : t))
    }
  }

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskName.trim()) return

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ display_name: newTaskName, status: 'pending', position: tasks.length }])
      .select()

    if (error) {
      setErrorMsg(error.message)
    } else {
      setTasks([...tasks, data[0]]) 
      setNewTaskName('')
      setIsModalOpen(false)
    }
  }

  const handleReorder = async (newOrder: any[]) => {
    setTasks(newOrder)
    // Mise à jour en base de données
    for (let i = 0; i < newOrder.length; i++) {
      await supabase
        .from('tasks')
        .update({ position: i })
        .eq('id', newOrder[i].id)
    }
  }

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) setErrorMsg(error.message)
    else {
      setTasks(tasks.filter(t => t.id !== id))
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-32 font-sans">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black tracking-tighter italic">Tchitchen</h1>
        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
           <span className="text-xs font-bold text-zinc-400">EL</span>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Le Mur</h2>
        
        {/* On utilise Reorder.Group pour englober la liste */}
        <Reorder.Group axis="y" values={tasks} onReorder={handleReorder} className="space-y-3">
          {tasks.map((task) => (
            <Reorder.Item 
              key={task.id} 
              value={task}
              // On garde EXACTEMENT tes classes ici
              className={`group w-full flex items-center p-5 border rounded-2xl transition-all touch-none ${
                task.status === 'in_progress' ? 'bg-blue-600/10 border-blue-500' : 
                task.status === 'completed' ? 'bg-zinc-900/50 border-zinc-800 opacity-50' : 
                'bg-zinc-900 border-zinc-800'
              }`}
            >
              <div 
                className="flex-1 cursor-pointer" 
                onClick={() => toggleStatus(task.id, task.status)}
              >
                <p className={`text-xl font-bold ${task.status === 'completed' ? 'line-through text-zinc-600' : 'text-white'}`}>
                  {task.display_name}
                </p>
                <p className={`text-xs font-black uppercase mt-1 ${
                  task.status === 'in_progress' ? 'text-blue-400' : 'text-zinc-500'
                }`}>
                  {STATUS_LABELS[task.status] || task.status}
                </p>
              </div>

              <button 
                onClick={() => {
                  if(confirm('Supprimer cette tâche ?')) deleteTask(task.id)
                }}
                className="ml-4 p-2 text-zinc-700 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-28 right-6 w-16 h-16 bg-white text-black rounded-full text-4xl font-light shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        +
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-3xl shadow-2xl">
            <h2 className="text-2xl font-black mb-6">Nouvelle tâche</h2>
            <form onSubmit={addTask}>
              <input 
                autoFocus
                type="text" 
                placeholder="Ex: Tailler les échalotes..."
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 p-4 rounded-xl mb-6 text-white outline-none focus:border-white transition-colors"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 rounded-xl font-bold text-zinc-400 hover:text-white transition-colors">
                  Annuler
                </button>
                <button type="submit" className="flex-1 bg-white text-black p-4 rounded-xl font-bold active:scale-95 transition-transform">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-800 p-6 flex justify-around items-center">
        <button className="text-white text-xs font-black tracking-widest uppercase">Accueil</button>
        <Link href="/recettes" className="text-zinc-600 text-xs font-black tracking-widest uppercase">Recettes</Link>
        <button className="text-zinc-600 text-xs font-black tracking-widest uppercase text-opacity-50 pointer-events-none">Historique</button>
      </div>
    </main>
  )
}