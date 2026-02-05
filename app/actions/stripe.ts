'use server'

import { stripe } from '@/lib/stripe'
import { PRODUCTS } from '@/lib/products'

export async function startCheckoutSession(productId: string): Promise<string> {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product with id "${productId}" not found`)
  }

  // Free plan - no checkout needed
  if (product.priceInCents === 0) {
    throw new Error('Free plan does not require checkout')
  }

  // Create Checkout Session for subscription
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description,
          },
          unit_amount: product.priceInCents,
          recurring: product.interval ? { interval: product.interval } : undefined,
        },
        quantity: 1,
      },
    ],
    mode: product.interval ? 'subscription' : 'payment',
  })

  if (!session.client_secret) {
    throw new Error('Failed to create checkout session')
  }

  return session.client_secret
}
