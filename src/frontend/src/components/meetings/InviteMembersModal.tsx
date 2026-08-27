'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, UserPlus, Trash2, Loader2, Users, Shield, CheckCircle2 } from 'lucide-react';
import { usersApi, meetingsApi, type UserSearchResult, type MeetingMember } from '@/lib/api';

interface InviteMembersModalProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMembersModal({ meetingId, isOpen, onClose }: InviteMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [members, setMembers] = useState<MeetingMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load current members
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await meetingsApi.getMembers(meetingId);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    (async () => {
      setLoadingMembers(true);
      try {
        const data = await meetingsApi.getMembers(meetingId);
        if (!ignore) setMembers(data);
      } catch (err) {
        console.error('Failed to load members:', err);
      } finally {
        if (!ignore) setLoadingMembers(false);
      }
    })();

    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      ignore = true;
      clearTimeout(timer);
      setSearchQuery('');
      setSearchResults([]);
      setFeedback(null);
    };
  }, [isOpen, meetingId]);

  // Debounced search
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return;

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await usersApi.search(query);
        const memberUserIds = new Set(members.map((m) => m.user_id));
        setSearchResults(results.filter((u) => !memberUserIds.has(u.id)));
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, members]);

  const handleAddMember = async (user: UserSearchResult) => {
    setAddingUserId(user.id);
    try {
      await meetingsApi.addMember(meetingId, user.id);
      setFeedback(`✅ Đã mời ${user.full_name}`);
      setSearchQuery('');
      setSearchResults([]);
      await loadMembers();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to add member:', err);
      setFeedback(`❌ Không thể mời ${user.full_name}`);
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveMember = async (member: MeetingMember) => {
    setRemovingMemberId(member.id);
    try {
      await meetingsApi.removeMember(meetingId, member.id);
      setFeedback('🗑️ Đã xóa thành viên');
      await loadMembers();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to remove member:', err);
      setFeedback('❌ Không thể xóa thành viên');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setRemovingMemberId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Mời thành viên</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) setSearchResults([]);
              }}
              placeholder="Tìm theo email hoặc tên..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all shadow-sm"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
            )}
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
            {feedback}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mx-5 mb-3 rounded-xl bg-muted border border-border overflow-hidden max-h-40 overflow-y-auto">
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleAddMember(user)}
                disabled={addingUserId === user.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{user.full_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </div>
                {addingUserId === user.id ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {searchQuery.trim() && !searching && searchResults.length === 0 && (
          <div className="mx-5 mb-3 px-4 py-3 rounded-xl bg-muted border border-border text-center">
            <p className="text-xs text-muted-foreground">
              Không tìm thấy user với &quot;{searchQuery}&quot;
            </p>
          </div>
        )}

        {/* Current Members */}
        <div className="border-t border-border">
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Thành viên hiện tại ({members.length})
            </p>
          </div>

          <div className="px-5 pb-5 space-y-1 max-h-48 overflow-y-auto">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Chưa có thành viên nào
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/60 group border border-transparent hover:border-border transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 shadow-sm">
                    {member.role === 'HOST' ? '👑' : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">
                      {member.user_id.slice(0, 8)}...
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          member.role === 'HOST'
                            ? 'bg-warning/20 text-warning-foreground'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {member.role}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {member.status}
                      </span>
                    </div>
                  </div>
                  {member.role !== 'HOST' && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      disabled={removingMemberId === member.id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                      title="Xóa thành viên"
                    >
                      {removingMemberId === member.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
