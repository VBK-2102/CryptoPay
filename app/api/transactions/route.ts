import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { mockTransactions } from "@/lib/mock-data"

export async function GET(request: NextRequest) {
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

    const userTransactions = mockTransactions.filter((t) => t.user_id === user.id)

    return NextResponse.json({
      success: true,
      data: userTransactions,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to get transactions" }, { status: 500 })
  }
}

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

    const transactionData = await request.json()

    const newTransaction = {
      id: mockTransactions.length + 1,
      user_id: user.id,
      ...transactionData,
      created_at: new Date().toISOString(),
    }

    mockTransactions.push(newTransaction)

    return NextResponse.json({
      success: true,
      data: newTransaction,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create transaction" }, { status: 500 })
  }
}
