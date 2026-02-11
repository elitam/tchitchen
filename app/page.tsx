'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
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
  const [duplicateError, setDuplicateError] = useState(false);
  const { user, logout } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [allRecipes, setAllRecipes] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
const [shoppingList, setShoppingList] = useState<any[]>([]);
const pathname = usePathname()

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
  setDuplicateError(false);
  setSelectedRecipeId(null);
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

const generateShoppingList = async () => {
  // 1. Trouver les IDs des recettes liées aux tâches "en cours"
  const inProgressRecipeIds = tasks
    .filter(t => t.status === 'in_progress' && t.recipe_id)
    .map(t => t.recipe_id);

  if (inProgressRecipeIds.length === 0) return;

  // 2. Récupérer les ingrédients de ces recettes
  const { data: recipes } = await supabase
    .from('recipes')
    .select('ingredients')
    .in('id', inProgressRecipeIds);

  if (!recipes) return;

  // 3. Fusionner les ingrédients (Additionner les quantités si même nom + même unité)
  const aggregated: Record<string, any> = {};

  recipes.forEach(r => {
    r.ingredients?.forEach((ing: any) => {
      const key = `${ing.item}-${ing.unit}`.toLowerCase();
      if (aggregated[key]) {
        aggregated[key].qty += Number(ing.qty);
      } else {
        aggregated[key] = { ...ing, qty: Number(ing.qty) };
      }
    });
  });

  setShoppingList(Object.values(aggregated));
  setIsShoppingListOpen(true);
};

  // 1. AJOUTER UNE TÂCHE + LOG
  const addTask = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const normalizedNewName = newTaskName.trim().toLowerCase();
  if (!normalizedNewName) return;

  // VERIFICATION DES DOUBLONS
  const isDuplicate = tasks.some(task => 
    task.display_name.toLowerCase().trim() === normalizedNewName
  );

  if (isDuplicate) {
    setDuplicateError(true);
    // On cache le message automatiquement après 3 secondes
    setTimeout(() => setDuplicateError(false), 3000);
    return; // ON S'ARRÊTE LÀ
  }

  // ... SI PAS DE DOUBLON, ON CONTINUE L'INSERTION SUPABASE ...
  const { data } = await supabase
    .from('tasks')
    .insert([{ 
      display_name: newTaskName.trim(), 
      status: 'pending', 
      recipe_id: selectedRecipeId 
    }])
    .select();

  if (data) {
    setTasks(sortTasks([data[0], ...tasks]));
    setNewTaskName('');
    setSelectedRecipeId(null);
    setIsModalOpen(false);
    setDuplicateError(false);
  }
};

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
    <main className="min-h-screen bg-black text-white p-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-40">
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black tracking-tighter uppercase">Tchitchen</h1>
        <button 
          onClick={() => { if(confirm("Se déconnecter ?")) logout() }}
          className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 active:scale-90"
        >
           <span className="text-[10px] font-black text-blue-400 uppercase">
             {user?.initials || '..'}
           </span>
        </button>
      </div>

      {/* 2. LE MUR (ANIMATION ORIGINALE) */}
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
  <h2 className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Mise en place</h2>
  
  {/* BOUTON MARCHÉ / SHOPPING LIST */}
  <button 
    onClick={generateShoppingList}
    disabled={!tasks.some(t => t.status === 'in_progress' && t.recipe_id)}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
      tasks.some(t => t.status === 'in_progress' && t.recipe_id)
      ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 animate-pulse'
      : 'bg-zinc-900 border-zinc-800 text-zinc-700 opacity-50'
    }`}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 7H4M20 12H4M20 17H4"/></svg>
    <span className="text-[10px] font-black uppercase">Réassort</span>
  </button>
</div>
        
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div 
                key={task.id}
                layout // C'est cette prop qui gère le glissement fluide
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 50, mass: 1 }}
                className={`group w-full flex items-center p-5 border rounded-3xl transition-colors ${
                  task.status === 'in_progress' ? 'bg-blue-600/10 border-blue-500/50' : 
                  task.status === 'completed' ? 'bg-zinc-900/30 border-zinc-900 opacity-40' : 
                  'bg-zinc-900 border-zinc-800'
                }`}
              >
                {/* Zone Texte & Lien */}
                <div className="flex-1 cursor-pointer" onClick={() => toggleStatus(task.id, task.status, task.display_name)}>
                  <div className="flex items-center gap-3">
                    <p className={`text-xl font-bold ${task.status === 'completed' ? 'line-through text-zinc-600' : 'text-white'}`}>
                      {task.display_name}
                    </p>
                    
                    {/* Lien Recette */}
                    {task.recipe_id && (
                      <Link 
                        href={`/recettes/${task.recipe_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                      </Link>
                    )}
                  </div>
                  <p className={`text-[10px] font-black uppercase mt-1 ${task.status === 'in_progress' ? 'text-blue-400' : 'text-zinc-500'}`}>
                    {STATUS_LABELS[task.status]}
                  </p>
                </div>

                {/* X */}
                <button 
                  onClick={() => { if(confirm(`Archiver "${task.display_name}" ?`)) deleteTask(task.id, task.display_name) }}
                  className="ml-4 p-2 text-zinc-800 hover:text-red-500"
                > ✕ </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. BOUTON + */}
      <button 
  onClick={() => setIsModalOpen(true)} 
  className="fixed bottom-[calc(env(safe-area-inset-bottom)+130px)] right-6 w-16 h-16 rounded-full bg-zinc-100/90 backdrop-blur-md border border-white/20 shadow-lg shadow-black/30 flex items-center justify-center active:scale-95 transition-all z-40 group"
>
  {/* Icône plus fine au lieu du gros texte "+" */}
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black group-active:scale-110 transition-transform">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
</button>
      
      {/* 4. MODAL & SUGGESTIONS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative">
            <h2 className="text-2xl font-black mb-6 uppercase">Nouvelle tâche</h2>
            <form onSubmit={addTask}>
              <div className="relative mb-6">
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="Ex: Tailler..." 
                  value={newTaskName} 
                  onChange={(e) => handleInputChange(e.target.value)} 
                  className="w-full bg-zinc-800 border border-zinc-700 p-5 rounded-2xl text-white outline-none focus:border-blue-500 text-base" 
                />

                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl z-[110]">
                    {suggestions.map(recipe => (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => {
                          setNewTaskName(recipe.title);
                          setSelectedRecipeId(recipe.id);
                          setSuggestions([]);
                        }}
                        className="w-full p-4 text-left hover:bg-zinc-700 border-b border-zinc-700 last:border-0 flex justify-between items-center"
                      >
                        <span className="text-sm font-bold text-white">{recipe.title}</span>
                        <span className="text-[9px] font-black text-blue-400 uppercase">Lier</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

{/* MESSAGE D'ERREUR DOUBLON */}
  {duplicateError && (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-6 flex items-center gap-3"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">
        Déjà dans la liste
      </span>
    </motion.div>
  )}

              <div className="flex gap-3">
                <button type="button"onClick={() => {
    setIsModalOpen(false);
    setNewTaskName(''); // Reset le nom
    setSelectedRecipeId(null); // Reset le lien !
    setSuggestions([]); // Vide les suggestions
  }} className="flex-1 p-4 font-bold text-zinc-500">Annuler</button>
                <button type="submit" className="flex-1 bg-white text-black p-4 rounded-xl font-black uppercase text-xs">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVBAR BASSE UNIFIÉE - VERSION TOQUE DE CHEF */}
<div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around items-center z-50 
  pt-3 pb-[calc(env(safe-area-inset-bottom)+10px)] px-6 shadow-lg shadow-black/50">
  
  {/* 1. MEP (ACCUEIL) - Icône Toque */}
  <Link href="/" className="flex flex-col items-center gap-1 group">
    <div className={`p-1 transition-all ${pathname === '/' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
        <line x1="6" y1="17" x2="18" y2="17"/>
      </svg>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/' ? 'text-white' : 'text-zinc-700'}`}>
      MEP
    </span>
  </Link>
  
  {/* 2. FICHES (RECETTES) - Icône Livre */}
  <Link href="/recettes" className="flex flex-col items-center gap-1 group">
    <div className={`p-1 transition-all ${pathname.includes('/recettes') ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${pathname.includes('/recettes') ? 'text-white' : 'text-zinc-700'}`}>
      Fiches
    </span>
  </Link>
  
  {/* 3. LOGS (HISTORIQUE) - Icône Horloge */}
  <Link href="/historique" className="flex flex-col items-center gap-1 group">
    <div className={`p-1 transition-all ${pathname === '/historique' ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
      </svg>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/historique' ? 'text-white' : 'text-zinc-700'}`}>
      Logs
    </span>
  </Link>
</div>

      {/* DRAWER SHOPPING LIST STYLE IPHONE */}
<AnimatePresence>
  {isShoppingListOpen && (
    <>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setIsShoppingListOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
      />
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-[2.5rem] z-[160] max-h-[80vh] overflow-y-auto pb-10 shadow-2xl"
      >
        <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mt-4 mb-8" />
        
        <div className="px-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black uppercase tracking-tight">Réassort</h3>
            <button onClick={() => setIsShoppingListOpen(false)} className="text-zinc-500 font-bold">OK</button>
          </div>

          <div className="space-y-4">
            {shoppingList.map((ing, i) => (
              <div key={i} className="flex justify-between items-center bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/30">
                <span className="text-zinc-300 font-bold uppercase text-sm">{ing.item}</span>
                <div className="flex gap-2 items-baseline">
                  <span className="text-white font-black text-xl">{ing.qty}</span>
                  <span className="text-zinc-500 text-[10px] font-black uppercase">{ing.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {shoppingList.length === 0 && (
            <p className="text-center text-zinc-600 italic py-10">Erreur lors de la génération...</p>
          )}
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
    </main>
  );
}