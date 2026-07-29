"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Calendar, Clock, Video } from "lucide-react";

interface Meeting {
  id: number;
  title: string;
  agenda: string;
  start_time: string;
  duration_minutes: int;
  is_active: boolean;
}

export default function MeetingsDashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/meetings/")
      .then((res) => res.json())
      .then((data) => {
        setMeetings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      <header className="h-20 px-6 md:px-12 border-b border-border/40 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-foreground rounded-sm flex items-center justify-center">
                <span className="text-background font-bold text-sm">DX</span>
              </div>
              <span className="font-semibold tracking-tight text-lg">Axiom Dashboard</span>
            </div>
          </Link>
        </div>
        <Link href="/meetings/create">
          <Button className="rounded-full px-6 font-medium gap-2">
            <Plus className="w-4 h-4" />
            New Meeting
          </Button>
        </Link>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-[1400px] w-full mx-auto">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Active Meetings</h1>
            <p className="text-muted-foreground mt-2">Manage your structured communications.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 border border-border/40 border-dashed rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 border border-border/40 border-dashed rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-lg">No meetings scheduled</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1">Deploy a new meeting to enforce structured process gates and capture organizational intelligence.</p>
              </div>
              <Link href="/meetings/create">
                <Button variant="outline" className="mt-2 rounded-full">Schedule First Meeting</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.map((meeting) => (
                <Card key={meeting.id} className="border-border/50 shadow-sm rounded-xl overflow-hidden hover:border-primary/50 transition-colors group">
                  <CardHeader className="p-6 pb-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl font-medium tracking-tight line-clamp-1">{meeting.title}</CardTitle>
                      {meeting.is_active && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(meeting.start_time).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {meeting.duration_minutes} min</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-6">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agenda Preview</p>
                      <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">{meeting.agenda}</p>
                    </div>
                    <Link href={`/meetings/${meeting.id}`} className="block">
                      <Button className="w-full rounded-lg font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="secondary">
                        <Video className="w-4 h-4 mr-2" />
                        Join Conference
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
