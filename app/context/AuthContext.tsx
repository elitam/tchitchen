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

  // Vérifie si un utilisateur est déjà enregistré dans le téléphone
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
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('tchitchen_user')
  }

  // Si pas d'utilisateur, on affiche l'écran du code
  if (!user) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-10">
        <h1 className="text-white text-2xl font-black italic mb-8 tracking-tighter">TCHITCHEN ACCESS</h1>
        <input
          type="password"
          pattern="\d*"
          inputMode="numeric"
          placeholder="CODE UNITÉ"
          className={`bg-zinc-900 border ${error ? 'border-red-500' : 'border-zinc-800'} text-white text-center text-4xl p-6 rounded-3xl w-full outline-none font-black tracking-[0.5em]`}
          onChange={(e) => {
            if (e.target.value.length === 4) login(e.target.value)
          }}
        />
        {error && <p className="text-red-500 text-[10px] font-black uppercase mt-4 tracking-widest">Code Invalide</p>}
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