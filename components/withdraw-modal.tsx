"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle } from "lucide-react"
import { currencies } from "@/lib/mock-data"

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  token: string
  balances: Record<string, number>
  onSuccess: () => void
}

export function WithdrawModal({ isOpen, onClose, token, balances, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [ifscCode, setIfscCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState("INR")

  const handleWithdraw = async () => {
    if (!amount || !accountNumber || !ifscCode) return

    const withdrawAmount = Number.parseFloat(amount)
    const availableBalance = balances[selectedCurrency] || 0
    if (withdrawAmount > availableBalance) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "withdrawal",
          amount: withdrawAmount,
          currency: selectedCurrency,
          status: "pending",
          payment_method: "bank_transfer",
        }),
      })

      if (response.ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 2000)
      }
    } catch (error) {
      console.error("Error processing withdrawal:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setAmount("")
    setAccountNumber("")
    setIfscCode("")
    setIsLoading(false)
    setIsSuccess(false)
    onClose()
  }

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 text-center py-8"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-600">Withdrawal Initiated!</h3>
              <p className="text-sm text-gray-600">Your withdrawal request for ₹{amount} has been submitted</p>
              <p className="text-xs text-gray-500">Funds will be transferred within 1-2 business days</p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw to Bank</DialogTitle>
          <DialogDescription>Transfer money from your wallet to bank account</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                    {currency.symbol} {currency.name} - Balance: {currency.symbol}
                    {(balances[currency.code] || 0).toLocaleString()}
                  </option>
                ))}
            </select>
          </div>

          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Available Balance:</div>
              <div className="text-xl font-bold">
                {currencies.find((c) => c.code === selectedCurrency)?.symbol}
                {(balances[selectedCurrency] || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Withdrawal Amount (INR)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={balances[selectedCurrency] || 0}
            />
            {Number.parseFloat(amount) > (balances[selectedCurrency] || 0) && (
              <p className="text-sm text-red-600">Amount exceeds available balance</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-number">Bank Account Number</Label>
            <Input
              id="account-number"
              placeholder="Enter account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifsc-code">IFSC Code</Label>
            <Input
              id="ifsc-code"
              placeholder="Enter IFSC code"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value)}
            />
          </div>

          <Button
            onClick={handleWithdraw}
            className="w-full"
            disabled={!amount || !accountNumber || !ifscCode || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Withdraw Money"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
