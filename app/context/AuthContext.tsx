'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const USERS_MAP: any = {
  "5368": { initials: "ET", role: "admin" },
  "2410": { initials: "ZZ", role: "user" },
  "2512": { initials: "CR", role: "admin" },
  "3006": { initials: "ML", role: "user" },
  "1515": { initials: "TM", role: "user" }


}

const AuthContext = createContext<any>({ user: null, logout: () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    setMounted(true)
    
    try {
      const savedUser = localStorage.getItem('tchitchen_user')
      if (savedUser && savedUser !== "undefined") {
        setUser(JSON.parse(savedUser))
      }
    } catch (e) {
      console.error("Erreur session:", e)
      localStorage.removeItem('tchitchen_user')
    }

    // MODIF VITESSE : 1.5 secondes au lieu de 2
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  const login = (inputCode: string) => {
    const foundUser = USERS_MAP[inputCode]
    if (foundUser) {
      setUser(foundUser)
      localStorage.setItem('tchitchen_user', JSON.stringify(foundUser))
      setError(false)
    } else {
      setError(true)
      setCode('')
    }
  }

  const handleKeyPress = (num: string) => {
    if (code.length < 4) {
      const newCode = code + num
      setCode(newCode)
      if (newCode.length === 4) {
        setTimeout(() => login(newCode), 150)
      }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('tchitchen_user')
    setCode('')
  }

  if (!mounted) return <div className="fixed inset-0 bg-black" />

  return (
    <AuthContext.Provider value={{ user, logout }}>
      <AnimatePresence mode="wait">
        
        {/* --- 1. LE SPLASH SCREEN SIGNATURE (Accéléré & Design iOS) --- */}
        {showSplash ? (
          <motion.div 
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }} // Zoom de sortie un peu plus prononcé
            transition={{ duration: 0.4, ease: "easeInOut" }} // Sortie plus rapide
            className="fixed inset-0 bg-black z-[10000] flex items-center justify-center select-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }} // Entrée plus rapide
            >
              {/* NOUVEAU LOGO SVG STYLE IOS */}
              <svg width="140" height="140" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Dégradé Or style Apple */}
                  <linearGradient id="iosGoldGradient" x1="12" y1="4" x2="12" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FCD34D" /> {/* Jaune or lumineux */}
                    <stop offset="1" stopColor="#B45309" /> {/* Or ambré profond */}
                  </linearGradient>
                  {/* Ombre portée douce pour la profondeur */}
                  <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#B45309" floodOpacity="0.4"/>
                  </filter>
                </defs>
                
                {/* La forme du T remplie avec le dégradé et l'ombre */}
                <path 
                  d="M6 4H18V8H14V20H10V8H6V4Z" 
                  fill="url(#iosGoldGradient)" 
                  filter="url(#softGlow)"
                  stroke="rgba(255,255,255,0.1)" // Fin contour blanc pour la netteté
                  strokeWidth="0.2"
                />
              </svg>
            </motion.div>
          </motion.div>
        ) 
        
        : !user ? (
          /* --- 2. L'ÉCRAN DE CODE --- */
          <motion.div 
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-6 select-none"
          >
            <h1 className="text-white text-4xl font-black tracking-tighter mb-16">Tchitchen</h1>
            <div className="flex gap-6 mb-16">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${code.length > i ? 'bg-white border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : error ? 'border-red-500 animate-shake' : 'border-zinc-700'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} onClick={() => handleKeyPress(num.toString())} className="w-20 h-20 rounded-full bg-zinc-800/40 border border-zinc-700/30 flex items-center justify-center text-3xl font-medium text-white active:bg-white active:text-black transition-all duration-100">
                  {num}
                </button>
              ))}
              <div />
              <button onClick={() => handleKeyPress('0')} className="w-20 h-20 rounded-full bg-zinc-800/40 border border-zinc-700/30 flex items-center justify-center text-3xl font-medium text-white active:bg-white active:text-black transition-all duration-100">0</button>
              <button onClick={() => setCode(code.slice(0, -1))} className="w-20 h-20 flex items-center justify-center text-zinc-400 active:text-white">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
              </button>
            </div>
            {error && <p className="text-red-500 text-[10px] font-black uppercase mt-12 tracking-[0.2em] animate-pulse">Code Incorrect</p>}
          </motion.div>
        ) 
        
        : (
          /* --- 3. L'APPLICATION --- */
          <motion.div 
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)