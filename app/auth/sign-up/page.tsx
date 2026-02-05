'use client'

import React from "react"

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

const VINTRA_LOGO = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/vintratext-skOk2ureyF4j9EWL7jotcLG1aD5kpr.png"

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/admin`,
          data: {
            company_name: companyName,
          },
        },
      })
      if (signUpError) throw signUpError
      
      // If session is returned (email confirmation disabled), set cookie
      if (data.session) {
        const maxAge = 60 * 60 * 24 * 365
        document.cookie = `sb-auth-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`
        document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax`
        router.push('/admin')
        router.refresh()
        return
      }
      
      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

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
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Start building your chatbot today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Acme Inc."
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repeat-password">Confirm Password</Label>
                  <Input
                    id="repeat-password"
                    type="password"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                {error && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button type="submit" className="mt-2 h-11 w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
