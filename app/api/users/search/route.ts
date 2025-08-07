import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { mockUsers } from "@/lib/mock-data"

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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.toLowerCase() || ""

    if (!query.trim()) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Search users by name or email
    const searchResults = mockUsers
      .filter(
        (u) =>
          u.id !== user.id && // Exclude current user
          (u.fullName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)),
      )
      .map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
      }))
      .slice(0, 10) // Limit to 10 results

    return NextResponse.json({
      success: true,
      data: searchResults,
    })
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 })
  }
}
