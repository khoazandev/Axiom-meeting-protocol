import re
with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_exit = """  const handleExitMeeting = useCallback(() => {
    const role = user?.role;
    if (role === 'OWNER' || role === 'ADMIN') {
      router.push('/admin');
    } else if (role === 'MANAGER') {
      router.push('/manager');
    } else {
      router.push('/member?tab=meetings');
    }
  }, [user, router]);"""

new_exit = """  const handleExitMeeting = useCallback(() => {
    const isHost = meetingMembers.some(m => m.user_id === user?.id && m.role === 'HOST');
    if (isHost) {
      setIsEndMeetingModalOpen(true);
      return;
    }
    
    if (window.confirm('Bạn có chắc chắn muốn rời khỏi cuộc họp?')) {
      const role = user?.role;
      if (role === 'OWNER' || role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'MANAGER') {
        router.push('/manager');
      } else {
        router.push('/member?tab=meetings');
      }
    }
  }, [meetingMembers, user, router]);"""

text = text.replace(old_exit, new_exit)

with open('src/frontend/src/app/meetings/[id]/meeting-room-client.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
