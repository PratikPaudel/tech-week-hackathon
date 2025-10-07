import { Button } from "@/components/ui/button"
import { Brain, FolderOpen, Search, Sparkles } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Tidy Mind</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Your Personal Knowledge Vault,{" "}
              <span className="text-primary">Organized.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Capture, organize, and retrieve your thoughts, insights, and knowledge
              with a powerful note-taking system that grows with your understanding.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link href="/signup">
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started for Free
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4 p-6 rounded-lg bg-card border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Organize by Topics</h3>
            <p className="text-muted-foreground">
              Create folders to categorize your knowledge and keep everything neatly organized.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg bg-card border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Powerful Search</h3>
            <p className="text-muted-foreground">
              Find exactly what you&apos;re looking for with full-text search across all your content.
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg bg-card border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Rich Content</h3>
            <p className="text-muted-foreground">
              Write detailed notes with rich text formatting, code blocks, and semantic search.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-semibold">Tidy Mind</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Tidy Mind. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
