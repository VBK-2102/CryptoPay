import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { getUserBalances } from "@/lib/mock-data"

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

    const balances = getUserBalances(user.id)

    return NextResponse.json({
      success: true,
      balances,
    })
  } catch (error) {
    console.error("Error fetching wallet balances:", error)
    return NextResponse.json({ success: false, error: "Failed to get balances" }, { status: 500 })
  }
}
