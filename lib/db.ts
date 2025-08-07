import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface User {
  id: number
  email: string
  password_hash: string
  full_name: string
  phone?: string
  wallet_balance: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  user_id: number
  type: "deposit" | "withdrawal" | "crypto_buy" | "crypto_sell"
  amount: number
  currency: string
  crypto_amount?: number
  crypto_currency?: string
  status: "pending" | "completed" | "failed"
  payment_method?: string
  transaction_hash?: string
  receiver_address?: string
  upi_reference?: string
  created_at: string
  updated_at: string
}

export interface CryptoPrice {
  id: number
  symbol: string
  price_inr: number
  price_usd: number
  change_24h: number
  updated_at: string
}

export const db = {
  // User operations
  async createUser(email: string, passwordHash: string, fullName: string, phone?: string) {
    try {
      const result = await sql`
        INSERT INTO users (email, password_hash, full_name, phone)
        VALUES (${email}, ${passwordHash}, ${fullName}, ${phone || null})
        RETURNING *
      `
      return result[0] as User
    } catch (error) {
      console.error("Database error creating user:", error)
      throw new Error("Failed to create user")
    }
  },

  async getUserByEmail(email: string) {
    try {
      const result = await sql`
        SELECT * FROM users WHERE email = ${email} LIMIT 1
      `
      return result[0] as User | undefined
    } catch (error) {
      console.error("Database error getting user by email:", error)
      return undefined
    }
  },

  async getUserById(id: number) {
    try {
      const result = await sql`
        SELECT * FROM users WHERE id = ${id} LIMIT 1
      `
      return result[0] as User | undefined
    } catch (error) {
      console.error("Database error getting user by id:", error)
      return undefined
    }
  },

  async updateUserBalance(userId: number, amount: number) {
    try {
      const result = await sql`
        UPDATE users 
        SET wallet_balance = wallet_balance + ${amount}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
        RETURNING wallet_balance
      `
      return result[0]?.wallet_balance as number
    } catch (error) {
      console.error("Database error updating balance:", error)
      throw new Error("Failed to update balance")
    }
  },

  async getAllUsers() {
    try {
      const result = await sql`
        SELECT id, email, full_name, phone, wallet_balance, is_admin, created_at
        FROM users
        ORDER BY created_at DESC
      `
      return result as Omit<User, "password_hash">[]
    } catch (error) {
      console.error("Database error getting all users:", error)
      return []
    }
  },

  // Transaction operations
  async createTransaction(transaction: Omit<Transaction, "id" | "created_at" | "updated_at">) {
    try {
      const result = await sql`
        INSERT INTO transactions (
          user_id, type, amount, currency, crypto_amount, crypto_currency,
          status, payment_method, transaction_hash, receiver_address, upi_reference
        )
        VALUES (
          ${transaction.user_id}, ${transaction.type}, ${transaction.amount}, 
          ${transaction.currency}, ${transaction.crypto_amount || null}, ${transaction.crypto_currency || null},
          ${transaction.status}, ${transaction.payment_method || null}, ${transaction.transaction_hash || null},
          ${transaction.receiver_address || null}, ${transaction.upi_reference || null}
        )
        RETURNING *
      `
      return result[0] as Transaction
    } catch (error) {
      console.error("Database error creating transaction:", error)
      throw new Error("Failed to create transaction")
    }
  },

  async getUserTransactions(userId: number) {
    try {
      const result = await sql`
        SELECT * FROM transactions 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 50
      `
      return result as Transaction[]
    } catch (error) {
      console.error("Database error getting user transactions:", error)
      return []
    }
  },

  async getAllTransactions() {
    try {
      const result = await sql`
        SELECT t.*, u.email, u.full_name
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
        LIMIT 100
      `
      return result as (Transaction & { email: string; full_name: string })[]
    } catch (error) {
      console.error("Database error getting all transactions:", error)
      return []
    }
  },

  async updateTransactionStatus(id: number, status: Transaction["status"]) {
    try {
      const result = await sql`
        UPDATE transactions 
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `
      return result[0] as Transaction
    } catch (error) {
      console.error("Database error updating transaction status:", error)
      throw new Error("Failed to update transaction status")
    }
  },

  // Crypto price operations
  async getCryptoPrices() {
    try {
      const result = await sql`
        SELECT * FROM crypto_prices
        ORDER BY symbol
      `
      return result as CryptoPrice[]
    } catch (error) {
      console.error("Database error getting crypto prices:", error)
      return []
    }
  },

  async updateCryptoPrice(symbol: string, priceInr: number, priceUsd: number, change24h: number) {
    try {
      const result = await sql`
        INSERT INTO crypto_prices (symbol, price_inr, price_usd, change_24h)
        VALUES (${symbol}, ${priceInr}, ${priceUsd}, ${change24h})
        ON CONFLICT (symbol) DO UPDATE SET
          price_inr = ${priceInr},
          price_usd = ${priceUsd},
          change_24h = ${change24h},
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `
      return result[0] as CryptoPrice
    } catch (error) {
      console.error("Database error updating crypto price:", error)
      throw new Error("Failed to update crypto price")
    }
  },
}
