'use client'

import { useCallback, useState } from 'react'
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

import { startCheckoutSession } from '@/app/actions/stripe'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function Checkout({ productId }: { productId: string }) {
  const [error, setError] = useState<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    try {
      const clientSecret = await startCheckoutSession(productId)
      if (!clientSecret) {
        throw new Error('Failed to create checkout session')
      }
      return clientSecret
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }, [productId])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button 
          onClick={() => setError(null)} 
          className="mt-2 text-sm text-primary underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
