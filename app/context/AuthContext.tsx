'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const USERS_MAP: any = {
  "5368": { initials: "ET", role: "admin" },
  "2410": { initials: "ZZ", role: "user" }
}

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem('tchitchen_user')
    if (savedUser) setUser(JSON.parse(savedUser))
  }, [])

  const login = (inputCode: string) => {
    const foundUser = USERS_MAP[inputCode]
    if (foundUser) {
      setUser(foundUser)
      localStorage.setItem('tchitchen_user', JSON.stringify(foundUser))
      setError(false)
    } else {
      setError(true)
      setCode('') // On reset le code si c'est faux
    }
  }

  const handleKeyPress = (num: string) => {
    if (code.length < 4) {
      const newCode = code + num
      setCode(newCode)
      if (newCode.length === 4) {
        // Petit délai pour voir le dernier point se remplir avant de valider
        setTimeout(() => login(newCode), 150)
      }
    }
  }

  const removeLast = () => {
    setCode(code.slice(0, -1))
    setError(false)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('tchitchen_user')
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-6 select-none">
        {/* Titre Tchitchen (non italique, font-black) */}
        <h1 className="text-white text-4xl font-black tracking-tighter mb-16">Tchitchen</h1>
        
        {/* Points du Code (Style iPhone) */}
        <div className="flex gap-6 mb-16">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                code.length > i 
                  ? 'bg-white border-white scale-110' 
                  : error ? 'border-red-500' : 'border-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Clavier Numérique */}
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center text-3xl font-bold active:bg-zinc-800 transition-colors"
            >
              {num}
            </button>
          ))}
          <div /> {/* Espace vide pour aligner le 0 */}
          <button
            onClick={() => handleKeyPress('0')}
            className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center text-3xl font-bold active:bg-zinc-800 transition-colors"
          >
            0
          </button>
          <button
            onClick={removeLast}
            className="w-20 h-20 flex items-center justify-center text-zinc-600 active:text-white transition-colors"
          >
            {/* Icône de suppression discrète */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-[10px] font-black uppercase mt-12 tracking-widest animate-pulse">
            Code Incorrect
          </p>
        )}
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)