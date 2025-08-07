import { NextRequest, NextResponse } from "next/server"
import { binanceAPI } from "@/lib/binance-api"

export async function GET(request: NextRequest) {
  try {
    // Get wallet balances (real or mock)
    const rawBalances = await binanceAPI.getWalletBalances()
    
    // Get current crypto prices for value calculations
    const prices = await binanceAPI.getCryptoPrices()
    
    // Convert balances to array with USD/INR values
    const balances = Object.entries(rawBalances).map(([asset, balance]) => {
      const price = prices.find(p => p.symbol === asset)
      const usdValue = price ? balance * price.price_usd : 0
      const inrValue = price ? balance * price.price_inr : 0
      
      return {
        asset,
        balance,
        usdValue,
        inrValue,
        price: price || null
      }
    })

    // Determine if using real or mock data
    const isRealData = Object.keys(rawBalances).length > 0 && 
                      !Object.values(rawBalances).every(v => v === 0)
    
    const source = isRealData ? 'binance' : 'mock'
    const message = isRealData 
      ? 'Real wallet balances from Binance API'
      : 'Demo wallet balances (Binance API restricted)'

    return NextResponse.json({
      success: true,
      balances,
      source,
      message,
      timestamp: new Date().toISOString(),
      totalAssets: balances.length,
      totalUsdValue: balances.reduce((sum, b) => sum + b.usdValue, 0),
      totalInrValue: balances.reduce((sum, b) => sum + b.inrValue, 0)
    })
  } catch (error) {
    console.error("Error fetching wallet balances:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch wallet balances",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
