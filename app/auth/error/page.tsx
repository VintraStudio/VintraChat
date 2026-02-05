import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const VINTRA_LOGO = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/vintratext-skOk2ureyF4j9EWL7jotcLG1aD5kpr.png"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

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
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
            <CardDescription>
              We couldn&apos;t complete your request
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {params?.error ? (
              <p className="rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
                {params.error}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                An unspecified error occurred. Please try again.
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/auth/login">
                <Button className="w-full">Try Again</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
