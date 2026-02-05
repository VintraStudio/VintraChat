'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, ArrowLeft } from 'lucide-react'
import { PRODUCTS, formatPrice } from '@/lib/products'

const VINTRA_LOGO = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/vintratext-skOk2ureyF4j9EWL7jotcLG1aD5kpr.png"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Choose the plan that fits your needs. Start free and upgrade as you grow.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {PRODUCTS.map((product) => (
              <Card 
                key={product.id} 
                className={`relative flex flex-col ${product.popular ? 'border-primary ring-2 ring-primary' : ''}`}
              >
                {product.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(product.priceInCents)}
                    </span>
                    {product.priceInCents > 0 && product.interval && (
                      <span className="text-muted-foreground">/{product.interval}</span>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href={product.priceInCents === 0 ? '/auth/sign-up' : `/checkout/${product.id}`} className="w-full">
                    <Button 
                      className="w-full" 
                      variant={product.popular ? 'default' : 'outline'}
                    >
                      {product.priceInCents === 0 ? 'Get Started Free' : 'Subscribe'}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* FAQ or additional info */}
          <div className="mt-20 text-center">
            <p className="text-muted-foreground">
              All plans include a 14-day free trial. No credit card required for Starter plan.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Need more? <Link href="mailto:support@vintra.no" className="text-primary hover:underline">Contact us</Link> for custom enterprise pricing.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
