// app/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Sparkles, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { signIn } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated - moved to useEffect to avoid render error
  useEffect(() => {
    if (!loading && user) {
      router.push('/chat')
    }
  }, [user, loading, router])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await signIn(email, password)
      
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        })
      } else if (data.user) {
        toast({
          title: "Welcome!",
          description: "Successfully signed in",
        })
        // Navigation will be handled by AuthContext and the useEffect above
      }
    } catch (error) {
      console.error("Sign in error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // Show redirect loading if user is authenticated (will redirect via useEffect)
  if (user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Redirecting...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black">
        <div className="flex items-center gap-4 p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-white" />
            <h1 className="text-2xl font-light text-white">Cover Letter Generator</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="bg-gray-950 border-gray-800 w-full">
          <CardHeader className="pb-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/10 p-3 rounded-full">
                <Lock className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-white font-light text-2xl">Sign In</CardTitle>
            <p className="text-gray-400 text-sm mt-2">
              Enter your credentials to access the cover letter generator
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 text-sm">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-black border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-600"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black hover:bg-gray-200 font-medium py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm">
                Don't have an account? Contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}