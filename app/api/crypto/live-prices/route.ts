import { NextResponse } from "next/server"
import { binanceAPI } from "@/lib/binance-api"

export async function GET() {
  try {
    // Get live prices from Binance or alternative sources (with caching)
    const prices = await binanceAPI.getCryptoPrices()
    
    // Try to get 24hr stats if using Binance (with proper error handling)
    let stats: any[] = []
    const usingBinance = prices.some(p => p.source === 'binance')
    
    if (usingBinance) {
      try {
        stats = await binanceAPI.get24hrStats()
        console.log('Successfully fetched 24hr stats:', stats.length, 'items')
      } catch (error) {
        console.log('Could not fetch 24hr stats, using price data only:', error)
        stats = []
      }
    }

    // Merge price data with 24hr statistics if available
    const enrichedPrices = prices.map(price => {
      const stat = stats.find(s => s && s.symbol === price.symbol)
      return {
        ...price,
        change_24h: stat?.priceChangePercent || price.change_24h || 0,
        volume_24h: stat?.volume || 0,
        price_change: stat?.priceChange || 0
      }
    })

    const dataSource = prices[0]?.source || 'unknown'
    const cacheStatus = binanceAPI.getCacheStatus()
    
    let message = ''
    
    switch (dataSource) {
      case 'binance':
        message = stats.length > 0 
          ? 'Live data from Binance API with 24hr stats'
          : 'Live data from Binance API (24hr stats unavailable)'
        break
      case 'coingecko':
        message = cacheStatus.cached && cacheStatus.age > 60000
          ? 'CoinGecko data (rate limited, using cache)'
          : 'Live data from CoinGecko API'
        break
      case 'cached':
        message = `Cached data from ${cacheStatus.source} (APIs temporarily unavailable)`
        break
      case 'fallback':
        message = 'Using fallback data (all APIs unavailable)'
        break
      default:
        message = 'Data source unknown'
    }
    
    return NextResponse.json({
      success: true,
      data: enrichedPrices,
      source: dataSource,
      message,
      timestamp: new Date().toISOString(),
      statsAvailable: stats.length > 0,
      cached: cacheStatus.cached,
      cacheAge: cacheStatus.age
    })
  } catch (error) {
    console.error("Error fetching live crypto prices:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch live prices",
        details: error instanceof Error ? error.message : "Unknown error",
        source: 'error'
      },
      { status: 500 }
    )
  }
}
