import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const user = simpleAuth.verifyToken(token)

    if (!user || !user.isAdmin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    // Get real-time statistics
    const [users, transactions] = await Promise.all([
      db.getAllUsers(),
      db.getAllTransactions()
    ])

    const totalUsers = users.length
    const totalTransactions = transactions.length
    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0)
    const completedTransactions = transactions.filter((t) => t.status === "completed").length
    const successRate = totalTransactions > 0 ? Math.round((completedTransactions / totalTransactions) * 100) : 0

    // Recent activity (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const recentTransactions = transactions.filter(
      t => new Date(t.created_at) > yesterday
    ).length

    const recentUsers = users.filter(
      u => new Date(u.created_at) > yesterday
    ).length

    // Transaction types breakdown
    const transactionTypes = transactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Monthly volume trend (last 6 months)
    const monthlyVolume = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.created_at)
        return tDate >= monthStart && tDate <= monthEnd && t.status === "completed"
      })
      
      const volume = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
      
      monthlyVolume.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        volume,
        transactions: monthTransactions.length
      })
    }

    const stats = {
      totalUsers,
      totalTransactions,
      totalVolume,
      successRate,
      recentTransactions,
      recentUsers,
      transactionTypes,
      monthlyVolume,
      averageTransactionValue: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
      topUsers: users
        .sort((a, b) => b.wallet_balance - a.wallet_balance)
        .slice(0, 5)
        .map(u => ({
          id: u.id,
          name: u.full_name,
          email: u.email,
          balance: u.wallet_balance
        }))
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ success: false, error: "Failed to get stats" }, { status: 500 })
  }
}
