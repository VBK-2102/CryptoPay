import { mockUsers } from "./mock-data"

export interface User {
  id: number
  email: string
  fullName: string
  walletBalance: number
  isAdmin: boolean
}

export const simpleAuth = {
  login(email: string, password: string): User | null {
    const user = mockUsers.find((u) => u.email === email && u.password === password)
    if (user) {
      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        walletBalance: user.walletBalance,
        isAdmin: user.isAdmin,
      }
    }
    return null
  },

  register(email: string, password: string, fullName: string): User {
    const newUser = {
      id: mockUsers.length + 1,
      email,
      password,
      fullName,
      walletBalance: 0,
      isAdmin: false,
    }
    mockUsers.push(newUser)

    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      walletBalance: newUser.walletBalance,
      isAdmin: newUser.isAdmin,
    }
  },

  generateToken(user: User): string {
    // Simple token - just base64 encoded user data
    return btoa(JSON.stringify(user))
  },

  verifyToken(token: string): User | null {
    try {
      return JSON.parse(atob(token))
    } catch {
      return null
    }
  },
}
