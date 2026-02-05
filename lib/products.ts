export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  interval?: 'month' | 'year'
  features: string[]
  popular?: boolean
}

export const PRODUCTS: Product[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small websites and personal projects',
    priceInCents: 0,
    interval: 'month',
    features: [
      '1 Chatbot',
      '100 conversations/month',
      'Basic customization',
      'Email support',
      '7-day chat history',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing businesses with more traffic',
    priceInCents: 2900,
    interval: 'month',
    popular: true,
    features: [
      '5 Chatbots',
      '2,000 conversations/month',
      'Full customization',
      'Priority support',
      'Unlimited chat history',
      'Canned responses',
      'Analytics dashboard',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For teams and enterprises with high volume',
    priceInCents: 9900,
    interval: 'month',
    features: [
      'Unlimited Chatbots',
      '10,000 conversations/month',
      'Full customization',
      'Dedicated support',
      'Unlimited chat history',
      'Canned responses',
      'Advanced analytics',
      'API access',
      'Remove Vintra branding',
    ],
  },
]

export function getProduct(productId: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === productId)
}

export function formatPrice(priceInCents: number): string {
  if (priceInCents === 0) return 'Free'
  return `$${(priceInCents / 100).toFixed(0)}`
}
