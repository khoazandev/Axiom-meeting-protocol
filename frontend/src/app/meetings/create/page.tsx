"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function CreateMeetingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    agenda: "",
    duration_minutes: 60,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // B2B Process check
    if (formData.agenda.trim().length < 20) {
      setError("Agenda must be at least 20 characters to ensure structured meetings.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/meetings/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to create meeting");
      }

      // Success
      router.push("/meetings");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      <header className="h-20 px-6 md:px-12 border-b border-border/40 flex items-center">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium text-sm">Back to Home</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-lg space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Deploy Meeting</h1>
            <p className="text-muted-foreground text-sm">Create a secure, structured video conference.</p>
          </div>
          
          <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
            <form onSubmit={handleSubmit}>
              <CardContent className="p-8 space-y-6">
                
                {error && (
                  <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">Meeting Title</Label>
                  <Input 
                    id="title"
                    placeholder="e.g. Q3 Architecture Review" 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="h-11 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="agenda" className="text-sm font-medium">Agenda (Process Gate)</Label>
                    <span className="text-xs text-muted-foreground">Min 20 chars</span>
                  </div>
                  <Textarea 
                    id="agenda"
                    placeholder="1. Review Q2 metrics&#10;2. Discuss Q3 roadmap&#10;3. Allocate resources" 
                    required
                    value={formData.agenda}
                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                    className="min-h-[120px] resize-y rounded-lg leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    A detailed agenda is required to enforce meeting structure and validate outcomes.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-medium">Duration (Minutes)</Label>
                  <Input 
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                    className="h-11 rounded-lg"
                  />
                </div>

              </CardContent>
              <CardFooter className="px-8 pb-8 pt-0 border-t border-border/10">
                <Button 
                  type="submit" 
                  className="w-full h-11 rounded-lg font-medium mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deploying...</>
                  ) : (
                    "Create Meeting"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
