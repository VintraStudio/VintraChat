'use client'

import { use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Check, Shield, CreditCard } from 'lucide-react'
import { getProduct, formatPrice } from '@/lib/products'
import { Checkout } from '@/components/checkout'
import { redirect } from 'next/navigation'

const VINTRA_LOGO = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/vintratext-skOk2ureyF4j9EWL7jotcLG1aD5kpr.png"

export default function CheckoutPage({ 
  params 
}: { 
  params: Promise<{ productId: string }> 
}) {
  const { productId } = use(params)
  const product = getProduct(productId)

  if (!product) {
    redirect('/pricing')
  }

  // Free plan doesn't need checkout
  if (product.priceInCents === 0) {
    redirect('/auth/sign-up')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image 
              src={VINTRA_LOGO} 
              alt="Vintra" 
              width={120} 
              height={40} 
              className="h-8 w-auto"
            />
          </Link>
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Pricing
            </Button>
          </Link>
        </div>
      </header>

      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Order Summary */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Complete your subscription
              </h1>
              <p className="mt-2 text-muted-foreground">
                Subscribe to {product.name} and start building your chatbot.
              </p>

              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 flex items-baseline justify-between border-b pb-4">
                    <span className="text-muted-foreground">Monthly subscription</span>
                    <div>
                      <span className="text-2xl font-bold text-foreground">
                        {formatPrice(product.priceInCents)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  <span>Powered by Stripe</span>
                </div>
              </div>
            </div>

            {/* Stripe Checkout */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Checkout productId={productId} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
