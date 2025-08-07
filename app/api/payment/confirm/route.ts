import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { mockTransactions, updateUserBalance } from "@/lib/mock-data"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const user = simpleAuth.verifyToken(token)

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
    }

    const { transactionId } = await request.json()

    if (!transactionId) {
      return NextResponse.json({ success: false, error: "Transaction ID required" }, { status: 400 })
    }

    // Find the pending transaction
    const transaction = mockTransactions.find(
      (t) => t.transaction_hash === transactionId && t.user_id === user.id && t.status === "pending",
    )

    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    // Update transaction status
    transaction.status = "completed"
    transaction.updated_at = new Date().toISOString()

    // Update user balance
    const newBalances = updateUserBalance(user.id, transaction.currency, transaction.amount)

    if (!newBalances) {
      return NextResponse.json({ success: false, error: "Failed to update balance" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${transaction.currency} ${transaction.amount} added successfully`,
      newBalances,
      transaction,
    })
  } catch (error) {
    console.error("Payment confirmation error:", error)
    return NextResponse.json({ success: false, error: "Failed to confirm payment" }, { status: 500 })
  }
}
