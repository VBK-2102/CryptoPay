"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Loader2, Send, User, Search, Bitcoin } from 'lucide-react'
import { currencies, mockCryptoPrices } from "@/lib/mock-data"

interface SendCryptoModalProps {
  isOpen: boolean
  onClose: () => void
  token: string
  currentUser: any
  balances: Record<string, number>
  liveCryptoPrices?: any[]
  onSuccess: () => void
}

export function SendCryptoModal({
  isOpen,
  onClose,
  token,
  currentUser,
  balances,
  liveCryptoPrices = [],
  onSuccess,
}: SendCryptoModalProps) {
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [amount, setAmount] = useState("")
  const [selectedCrypto, setSelectedCrypto] = useState("")
  const [recipientCurrency, setRecipientCurrency] = useState("INR")
  const [note, setNote] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")
  const [transactionId, setTransactionId] = useState("")

  const [fiatAmount, setFiatAmount] = useState("")
  const [fromCurrency, setFromCurrency] = useState("INR")

  const convertFiatToCrypto = (fiatAmount: number, fromCurrency: string, toCrypto: string): number => {
    const crypto = liveCryptoPrices.find((c) => c.symbol === toCrypto) ||
                mockCryptoPrices.find((c) => c.symbol === toCrypto)
    if (!crypto) return 0

    let cryptoPrice = 0
    if (fromCurrency === "INR") {
      cryptoPrice = crypto.price_inr
    } else if (fromCurrency === "USD") {
      cryptoPrice = crypto.price_usd
    } else if (fromCurrency === "EUR") {
      cryptoPrice = crypto.price_usd * 0.85
    } else if (fromCurrency === "GBP") {
      cryptoPrice = crypto.price_usd * 0.75
    }

    return fiatAmount / cryptoPrice
  }

  const getTotalAvailableCrypto = (cryptoSymbol: string): number => {
    const directCryptoBalance = balances[cryptoSymbol] || 0

    // Calculate total fiat balance in INR
    let totalFiatINR = 0
    Object.entries(balances).forEach(([currency, amount]) => {
      const curr = currencies.find((c) => c.code === currency)
      if (curr?.type === "fiat") {
        if (currency === "INR") {
          totalFiatINR += amount
        } else if (currency === "USD") {
          totalFiatINR += amount * 83.5
        } else if (currency === "EUR") {
          totalFiatINR += amount * 90
        } else if (currency === "GBP") {
          totalFiatINR += amount * 105
        }
      }
    })

    // Convert total fiat to crypto
    let cryptoFromFiat = 0
    if (totalFiatINR > 0) {
      cryptoFromFiat = convertFiatToCrypto(totalFiatINR, "INR", cryptoSymbol)
    }

    return directCryptoBalance + cryptoFromFiat
  }

  const getCryptoPrice = (cryptoSymbol: string, fiatCurrency: string): string => {
    const crypto = liveCryptoPrices.find((c) => c.symbol === cryptoSymbol) ||
                mockCryptoPrices.find((c) => c.symbol === cryptoSymbol)
    if (!crypto) return "0"

    let price = 0
    if (fiatCurrency === "INR") {
      price = crypto.price_inr
    } else if (fiatCurrency === "USD") {
      price = crypto.price_usd
    } else if (fiatCurrency === "EUR") {
      price = crypto.price_usd * 0.85
    } else if (fiatCurrency === "GBP") {
      price = crypto.price_usd * 0.75
    }

    return price.toLocaleString()
  }

  const cryptoCurrencies = currencies.filter((c) => c.type === "crypto")
  const fiatCurrencies = currencies.filter((c) => c.type === "fiat")

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        const filteredResults = data.data.filter((user: UserSearchResult) => user.id !== currentUser.id)
        setSearchResults(filteredResults)
      }
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleUserSelect = (user: UserSearchResult) => {
    setSelectedUser(user)
    setSearchQuery(user.fullName)
    setSearchResults([])
    setStep(2)
  }

  const handleSendCrypto = async () => {
    if (!selectedUser || !amount || !selectedCrypto) return

    const sendAmount = Number.parseFloat(amount)
    const totalAvailable = getTotalAvailableCrypto(selectedCrypto)

    if (sendAmount > totalAvailable) {
      setError("Insufficient crypto balance")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/transactions/send-crypto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: selectedUser.id,
          cryptoAmount: sendAmount,
          cryptoSymbol: selectedCrypto,
          recipientCurrency,
          note: note.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTransactionId(data.transactionId)
        setStep(3)
      } else {
        setError(data.error || "Failed to send crypto")
      }
    } catch (error) {
      console.error("Error sending crypto:", error)
      setError("Failed to send crypto. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSearchQuery("")
    setSearchResults([])
    setSelectedUser(null)
    setAmount("")
    setFiatAmount("")
    setFromCurrency("INR")
    setSelectedCrypto("")
    setRecipientCurrency("INR")
    setNote("")
    setError("")
    setTransactionId("")
    onClose()
  }

  const handleSuccess = () => {
    onSuccess()
    handleClose()
  }

  const selectedCryptoData = currencies.find((c) => c.code === selectedCrypto)
  const recipientCurrencyData = currencies.find((c) => c.code === recipientCurrency)
  const totalAvailableBalance = selectedCrypto ? getTotalAvailableCrypto(selectedCrypto) : 0
  const directCryptoBalance = selectedCrypto ? balances[selectedCrypto] || 0 : 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bitcoin className="h-5 w-5 mr-2" />
            Send Cryptocurrency
          </DialogTitle>
          <DialogDescription>Send crypto directly from your wallet to another user</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="search">Search Recipient</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      searchUsers(e.target.value)
                    }}
                    className="pl-10"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>

              {searchResults.length > 0 && (
                <Card className="max-h-60 overflow-y-auto">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-3"
                        >
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {user.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No users found</p>
                </div>
              )}

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            </motion.div>
          )}

          {step === 2 && selectedUser && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{selectedUser.fullName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-medium">Sending to:</div>
                      <div className="text-lg font-bold">{selectedUser.fullName}</div>
                      <div className="text-sm text-gray-600">{selectedUser.email}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="crypto">Select Cryptocurrency</Label>
                <select
                  id="crypto"
                  value={selectedCrypto}
                  onChange={(e) => setSelectedCrypto(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Choose crypto to send</option>
                  {cryptoCurrencies.map((crypto) => {
                    const totalAvailable = getTotalAvailableCrypto(crypto.code)
                    return (
                      <option key={crypto.code} value={crypto.code}>
                        {crypto.symbol} {crypto.name} - Available: {totalAvailable.toFixed(8)}
                      </option>
                    )
                  })}
                </select>
              </div>

              {selectedCrypto && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-blue-800 mb-3">
                      💰 Available Crypto from Your Fiat Balance
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {fiatCurrencies.map((fiatCurrency) => {
                        const fiatBalance = balances[fiatCurrency.code] || 0
                        if (fiatBalance <= 0) return null

                        const cryptoEquivalent = convertFiatToCrypto(fiatBalance, fiatCurrency.code, selectedCrypto)

                        return (
                          <div
                            key={fiatCurrency.code}
                            className="flex justify-between items-center bg-white/60 rounded-lg p-3"
                          >
                            <div className="flex items-center">
                              <span className="text-lg mr-2">{fiatCurrency.symbol}</span>
                              <div>
                                <div className="font-medium">{fiatCurrency.name}</div>
                                <div className="text-sm text-gray-600">
                                  Balance: {fiatCurrency.symbol}
                                  {fiatBalance.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-800">
                                {cryptoEquivalent.toFixed(8)} {selectedCrypto}
                              </div>
                              <div className="text-xs text-gray-500">Available to send</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Show direct crypto balance if any */}
                    {directCryptoBalance > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex justify-between items-center bg-purple-50 rounded-lg p-3">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">{selectedCryptoData?.symbol}</span>
                            <div>
                              <div className="font-medium">Direct {selectedCrypto} Balance</div>
                              <div className="text-sm text-gray-600">Ready to send</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-800">
                              {directCryptoBalance.toFixed(8)} {selectedCrypto}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total Available Summary */}
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex justify-between items-center bg-green-50 rounded-lg p-3">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">💎</span>
                          <div>
                            <div className="font-medium">Total Available to Send</div>
                            <div className="text-sm text-gray-600">Direct + From Fiat</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-800 text-lg">
                            {totalAvailableBalance.toFixed(8)} {selectedCrypto}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedCrypto && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">💱 Currency Converter</div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fiat-currency">From Currency</Label>
                      <select
                        id="fiat-currency"
                        value={fromCurrency}
                        onChange={(e) => setFromCurrency(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {fiatCurrencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.name} - Balance: {currency.symbol}
                            {(balances[currency.code] || 0).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fiat-amount">
                        Amount ({currencies.find((c) => c.code === fromCurrency)?.symbol})
                      </Label>
                      <Input
                        id="fiat-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={fiatAmount}
                        onChange={(e) => {
                          setFiatAmount(e.target.value)
                          if (e.target.value) {
                            const converted = convertFiatToCrypto(
                              Number.parseFloat(e.target.value),
                              fromCurrency,
                              selectedCrypto,
                            )
                            setAmount(converted.toString())
                          } else {
                            setAmount("")
                          }
                        }}
                        max={balances[fromCurrency] || 0}
                      />
                      <div className="text-xs text-gray-500">
                        Max: {currencies.find((c) => c.code === fromCurrency)?.symbol}
                        {(balances[fromCurrency] || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {fiatAmount && amount && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Conversion:</div>
                      <div className="text-lg font-bold text-blue-800">
                        {currencies.find((c) => c.code === fromCurrency)?.symbol}
                        {Number.parseFloat(fiatAmount).toLocaleString()} {fromCurrency}
                        <span className="mx-2">→</span>
                        {Number.parseFloat(amount).toFixed(8)} {selectedCrypto}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Rate: 1 {selectedCrypto} = {getCryptoPrice(selectedCrypto, fromCurrency)} {fromCurrency}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 text-center">Or enter crypto amount directly below ↓</div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({selectedCryptoData?.symbol})</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.00000001"
                  placeholder={`Enter ${selectedCrypto} amount`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={totalAvailableBalance}
                />
                <div className="text-xs text-green-600 font-medium">
                  Available: {totalAvailableBalance.toFixed(8)} {selectedCrypto}
                  {directCryptoBalance > 0 && (
                    <span className="text-gray-500">
                      {" "}
                      ({directCryptoBalance.toFixed(8)} direct +{" "}
                      {(totalAvailableBalance - directCryptoBalance).toFixed(8)} from fiat)
                    </span>
                  )}
                </div>
                {Number.parseFloat(amount) > totalAvailableBalance && (
                  <div className="text-sm text-red-600">Amount exceeds available balance</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient-currency">Recipient Will Receive</Label>
                <select
                  id="recipient-currency"
                  value={recipientCurrency}
                  onChange={(e) => setRecipientCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fiatCurrencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Input
                  id="note"
                  placeholder="Add a note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSendCrypto}
                  className="flex-1"
                  disabled={
                    !amount ||
                    !selectedCrypto ||
                    Number.parseFloat(amount) <= 0 ||
                    Number.parseFloat(amount) > totalAvailableBalance ||
                    isLoading
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send {selectedCryptoData?.symbol}
                      {amount || "0"}
                    </>
                  )}
                </Button>
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4 text-center"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-600">Crypto Sent Successfully!</h3>
                <p className="text-sm text-gray-600">
                  {selectedCryptoData?.symbol}
                  {amount} {selectedCrypto} sent to {selectedUser?.fullName}
                </p>
                <p className="text-sm text-gray-600">
                  They will receive it as {recipientCurrencyData?.symbol} {recipientCurrency} in their wallet
                </p>
                {note && <p className="text-sm text-gray-500 italic">"{note}"</p>}
                <div className="text-xs text-gray-400 mt-2">Transaction ID: {transactionId}</div>
              </div>

              <Button onClick={handleSuccess} className="w-full">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
