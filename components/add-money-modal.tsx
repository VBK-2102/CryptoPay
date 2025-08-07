"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { QrCode, CheckCircle, Loader2 } from "lucide-react"
import { currencies } from "@/lib/mock-data"

interface AddMoneyModalProps {
  isOpen: boolean
  onClose: () => void
  token: string
  onSuccess: () => void
}

export function AddMoneyModal({ isOpen, onClose, token, onSuccess }: AddMoneyModalProps) {
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("INR")
  const [qrCode, setQrCode] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGenerateQR = async () => {
    if (!amount || !selectedCurrency) return

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/payment/generate-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          currency: selectedCurrency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      if (data.success) {
        setQrCode(data.qrCode)
        setTransactionId(data.transactionId)
        setStep(2)

        // Simulate payment confirmation after 5 seconds
        setTimeout(async () => {
          await confirmPayment(data.transactionId)
        }, 5000)
      } else {
        throw new Error(data.error || "Failed to generate QR code")
      }
    } catch (error) {
      console.error("Error generating QR:", error)
      setError(error instanceof Error ? error.message : "Failed to generate QR code")
    } finally {
      setIsLoading(false)
    }
  }

  const confirmPayment = async (txnId: string) => {
    try {
      const response = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId: txnId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStep(3)
        // Trigger balance refresh in parent component
        setTimeout(() => {
          onSuccess()
        }, 1000)
      } else {
        setError(data.error || "Payment confirmation failed")
      }
    } catch (error) {
      console.error("Error confirming payment:", error)
      setError("Failed to confirm payment")
    }
  }

  const handleClose = () => {
    setStep(1)
    setAmount("")
    setSelectedCurrency("INR")
    setQrCode("")
    setTransactionId("")
    setError("")
    onClose()
  }

  const handleSuccess = () => {
    onSuccess()
    handleClose()
  }

  const selectedCurrencyData = currencies.find((c) => c.code === selectedCurrency)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Money to Wallet</DialogTitle>
          <DialogDescription>Choose currency and add money to your multi-currency wallet</DialogDescription>
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
                <Label htmlFor="currency">Select Currency</Label>
                <select
                  id="currency"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {currencies
                    .filter((c) => c.type === "fiat")
                    .map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({selectedCurrencyData?.symbol})</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Enter amount in ${selectedCurrency}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {selectedCurrencyData && amount && (
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600">You will add:</div>
                    <div className="text-lg font-bold">
                      {selectedCurrencyData.symbol}
                      {Number.parseFloat(amount).toLocaleString()} {selectedCurrency}
                    </div>
                    <div className="text-sm text-gray-500">to your {selectedCurrencyData.name} wallet</div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleGenerateQR}
                className="w-full"
                disabled={!amount || !selectedCurrency || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Payment...
                  </>
                ) : (
                  "Generate Payment QR"
                )}
              </Button>

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 text-center"
            >
              <div className="space-y-2">
                <QrCode className="h-8 w-8 mx-auto text-blue-600" />
                <h3 className="text-lg font-semibold">Scan QR to Pay</h3>
                <p className="text-sm text-gray-600">
                  Pay {selectedCurrencyData?.symbol}
                  {amount} using payment app
                </p>
              </div>

              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode || "/placeholder.svg"} alt="Payment QR Code" className="w-64 h-64" />
                </div>
              )}

              <Card className="bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Processing payment...</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Transaction ID: {transactionId}</div>
                  <div className="text-xs text-blue-600 mt-1">Payment will be confirmed automatically</div>
                </CardContent>
              </Card>

              <Button variant="outline" onClick={handleClose} className="w-full bg-transparent">
                Cancel
              </Button>
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
                <h3 className="text-lg font-semibold text-green-600">Payment Successful!</h3>
                <p className="text-sm text-gray-600">
                  {selectedCurrencyData?.symbol}
                  {amount} {selectedCurrency} has been added to your wallet
                </p>
                <p className="text-xs text-green-600">Your balance has been updated!</p>
              </div>

              <Button onClick={handleSuccess} className="w-full">
                Continue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
