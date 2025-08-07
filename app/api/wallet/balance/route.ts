import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"

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

    return NextResponse.json({
      success: true,
      balance: user.walletBalance,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to get balance" }, { status: 500 })
  }
}
