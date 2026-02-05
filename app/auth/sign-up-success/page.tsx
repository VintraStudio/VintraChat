import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const VINTRA_LOGO = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/vintratext-skOk2ureyF4j9EWL7jotcLG1aD5kpr.png"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-muted/30 p-4 sm:p-6 md:p-10">
      <Link href="/" className="mb-8 flex items-center">
        <Image 
          src={VINTRA_LOGO} 
          alt="Vintra" 
          width={140} 
          height={48} 
          className="h-10 w-auto"
        />
      </Link>
      
      <div className="w-full max-w-sm">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <Mail className="h-7 w-7 text-accent-foreground" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent you a confirmation link
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Click the link in your email to confirm your account and access your admin dashboard. 
              The link will expire in 24 hours.
            </p>
            <div className="mt-6">
              <Link 
                href="/auth/login" 
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
