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

    // Get real users from database
    const users = await db.getAllUsers()

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ success: false, error: "Failed to get users" }, { status: 500 })
  }
}
