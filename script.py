with open('src/frontend/src/components/member/MemberMeetingsTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_str = \"import { MeetingDetailsModal } from '@/components/knowledge/MeetingDetailsModal';\n\"
if import_str not in content:
    content = content.replace(\"import { meetingsApi\", import_str + \"import { meetingsApi\")

state_str = \"const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState<{id: string, title: string} | null>(null);\"
if state_str not in content:
    content = content.replace(\"const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);\", \"const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);\\n  \" + state_str)

button_str = \"\"\"
                      <button
                        onClick={() => setSelectedMeetingForDetails({ id: m.id, title: m.title })}
                        className=\"flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shrink-0\"
                        title=\"Biên b?n AI\"
                      >
                        <Sparkles className=\"w-4 h-4\" />
                        <span className=\"text-sm font-medium\">Biên B?n AI</span>
                      </button>
\"\"\"
if \"Biên B?n AI\" not in content:
    content = content.replace(\"{/* Actions */}\", \"{/* Actions */}\\n\" + button_str)

modal_str = \"\"\"
      {selectedMeetingForDetails && (
        <MeetingDetailsModal
          meetingId={selectedMeetingForDetails.id}
          meetingTitle={selectedMeetingForDetails.title}
          onClose={() => setSelectedMeetingForDetails(null)}
        />
      )}
\"\"\"
if \"MeetingDetailsModal meetingId\" not in content:
    content = content.replace(\"export function MemberMeetingsTab\", modal_str + \"\\nexport function MemberMeetingsTab\")

with open('src/frontend/src/components/member/MemberMeetingsTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
