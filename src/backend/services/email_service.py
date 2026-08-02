"""
Email Service Helper — Renders HTML email notification templates for meetings, invitations, and tasks.
"""

def render_invitation_email(email: str, meeting_title: str, join_url: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0B0F19; color: #FFFFFF; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #131B2E; padding: 24px; border-radius: 16px; border: 1px solid #1E293B;">
          <h2 style="color: #60A5FA;">Meeting Invitation: {meeting_title}</h2>
          <p style="color: #94A3B8;">You have been invited to join <strong>{meeting_title}</strong> on Axiom.</p>
          <div style="margin: 24px 0;">
            <a href="{join_url}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Join Meeting Room</a>
          </div>
          <p style="font-size: 12px; color: #64748B;">Recipient: {email}</p>
        </div>
      </body>
    </html>
    """


def render_task_assigned_email(email: str, task_title: str, meeting_title: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0B0F19; color: #FFFFFF; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #131B2E; padding: 24px; border-radius: 16px; border: 1px solid #1E293B;">
          <h2 style="color: #34D399;">New Action Item Assigned</h2>
          <p style="color: #94A3B8;">A new action item was assigned to you from meeting <strong>{meeting_title}</strong>:</p>
          <div style="background-color: #0B0F19; padding: 16px; border-radius: 8px; border: 1px solid #1E293B; margin: 16px 0;">
            <strong style="color: #FFFFFF;">{task_title}</strong>
          </div>
          <p style="font-size: 12px; color: #64748B;">Recipient: {email}</p>
        </div>
      </body>
    </html>
    """


def render_mom_digest_email(email: str, meeting_title: str, summary: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0B0F19; color: #FFFFFF; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #131B2E; padding: 24px; border-radius: 16px; border: 1px solid #1E293B;">
          <h2 style="color: #A78BFA;">Minutes of Meeting Digest: {meeting_title}</h2>
          <p style="color: #94A3B8;">Here is the executive summary for <strong>{meeting_title}</strong>:</p>
          <div style="background-color: #0B0F19; padding: 16px; border-radius: 8px; border: 1px solid #1E293B; margin: 16px 0; color: #E2E8F0;">
            {summary}
          </div>
          <p style="font-size: 12px; color: #64748B;">Recipient: {email}</p>
        </div>
      </body>
    </html>
    """
