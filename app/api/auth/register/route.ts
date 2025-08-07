import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { mockUsers } from "@/lib/mock-data"

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: "Email, password, and full name are required" },
        { status: 400 },
      )
    }

    // Check if user exists
    const existingUser = mockUsers.find((u) => u.email === email)
    if (existingUser) {
      return NextResponse.json({ success: false, error: "User already exists" }, { status: 400 })
    }

    const user = simpleAuth.register(email, password, fullName)
    const token = simpleAuth.generateToken(user)

    return NextResponse.json({
      success: true,
      token,
      user,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 })
  }
}
