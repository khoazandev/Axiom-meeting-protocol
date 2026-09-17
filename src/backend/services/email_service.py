"""
Email Service — Renders professional HTML email notification templates and dispatches emails via SMTP.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from src.backend.core.config import get_settings

logger = logging.getLogger(__name__)


def render_org_invitation_email(
    recipient_email: str,
    recipient_name: str | None,
    organization_name: str,
    inviter_name: str,
    inviter_email: str,
    department_name: str | None,
    job_title: str | None,
    role_name: str,
    register_url: str,
    expires_at_str: str,
    invite_code: str | None = None,
) -> str:
    """Renders a prestigious, enterprise-grade executive HTML email invitation."""
    display_name = recipient_name.strip() if recipient_name and recipient_name.strip() else recipient_email.split('@')[0]
    dept_badge = department_name if department_name else "Toàn Cơ Quan / Ban Điều Hành"
    job_badge = job_title if job_title else "Thành viên Công tác"
    role_badge = {
        "OWNER": "Chủ Sở Hữu / Hội Đồng Quản Trị (OWNER)",
        "ADMIN": "Quản Trị Viên Hệ Thống (ADMIN)",
        "MANAGER": "Trưởng Khối / Quản Lý Phòng Ban (MANAGER)",
        "MEMBER": "Thành Viên Chính Thức (MEMBER)",
    }.get(role_name.upper(), role_name)

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thư mời gia nhập tổ chức {organization_name} — Axiom Enterprise</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 32px 28px; text-align: left; border-bottom: 3px solid #2563eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Logo / Brand Title -->
                    <div style="display: inline-block; padding: 6px 12px; background: rgba(37, 99, 235, 0.2); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 8px; color: #93c5fd; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                      AXIOM ENTERPRISE PROTOCOL
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      Thư Mời Gia Nhập Doanh Nghiệp
                    </h1>
                    <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
                      Hệ thống điều hành và giao thức cuộc họp bảo mật cấp cao
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <!-- Salutation -->
              <p style="font-size: 15px; margin: 0 0 16px; color: #0f172a;">
                Kính gửi <strong>{display_name}</strong>,
              </p>

              <p style="font-size: 14px; color: #334155; margin: 0 0 20px; line-height: 1.6;">
                Ban Điều Hành và Quản trị viên <strong>{inviter_name}</strong> ({inviter_email}) trân trọng gửi tới bạn lời mời chính thức gia nhập không gian số của tổ chức <strong>{organization_name}</strong> trên nền tảng <strong>Axiom</strong>.
              </p>

              <!-- Security Policy Notice Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 12px 12px 0; margin-bottom: 24px; padding: 14px 18px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">
                      🔒 Cơ Chế Bảo Mật Nội Bộ Doanh Nghiệp
                    </div>
                    <div style="font-size: 12.5px; color: #475569; line-height: 1.5;">
                      Axiom được bảo vệ bằng giao thức bảo mật khép kín. Người dùng <strong>không thể tự ý đăng ký tham gia công ty</strong> nếu không có Thư mời chính thức kèm token xác thực này từ Ban Quản Trị.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Invitation Credentials Specs Table -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 28px; overflow: hidden;">
                <tr>
                  <td colspan="2" style="background-color: #f1f5f9; padding: 10px 16px; font-size: 11.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">
                    Thông Tin Bổ Nhiệm & Điều Phối Ban Đầu
                  </td>
                </tr>
                <tr>
                  <td width="38%" style="padding: 10px 16px; font-size: 12.5px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Tổ chức / Công ty:</td>
                  <td width="62%" style="padding: 10px 16px; font-size: 12.5px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">{organization_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Phòng ban tiếp nhận:</td>
                  <td style="padding: 10px 16px; font-size: 12.5px; font-weight: 700; color: #2563eb; border-bottom: 1px solid #f1f5f9;">{dept_badge}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Chức danh / Vị trí:</td>
                  <td style="padding: 10px 16px; font-size: 12.5px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">{job_badge}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b; border-bottom: 1px solid #f1f5f9;">Cấp bậc phân quyền:</td>
                  <td style="padding: 10px 16px; font-size: 12.5px; font-weight: 700; color: #059669; border-bottom: 1px solid #f1f5f9;">{role_badge}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 12.5px; color: #64748b;">Hạn chót kích hoạt:</td>
                  <td style="padding: 10px 16px; font-size: 12.5px; color: #dc2626; font-weight: 600;">{expires_at_str} (Hiệu lực 7 ngày)</td>
                </tr>
              </table>

              <!-- 6-Digit Invitation Code Box -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border: 2px dashed #2563eb; border-radius: 16px; padding: 22px 18px; text-align: center; margin: 22px 0 20px;">
                <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                  MÃ MỜI GIA NHẬP (6 CHỮ SỐ)
                </div>
                <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #1e3a8a; font-family: 'Courier New', Consolas, monospace; margin: 6px 0 8px;">
                  {invite_code or '------'}
                </div>
                <div style="font-size: 12px; color: #475569; line-height: 1.4;">
                  Nhập mã mời 6 số này tại trang web để gia nhập, hoặc nhấp vào nút bên dưới để được tự động xác thực.
                </div>
              </div>

              <!-- Action Button CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 18px 0 20px;">
                <tr>
                  <td align="center">
                    <a href="{register_url}" target="_blank" style="display: inline-block; padding: 15px 36px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 14.5px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); text-align: center; letter-spacing: 0.2px;">
                      👉 Xác Nhận & Gia Nhập Doanh Nghiệp
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link -->
              <p style="font-size: 11.5px; color: #64748b; text-align: center; margin: 0 0 24px; line-height: 1.5;">
                Nếu nút trên không thể bấm, bạn có thể sao chép liên kết bên dưới dán vào trình duyệt:<br>
                <a href="{register_url}" style="color: #2563eb; word-break: break-all; font-size: 11px;">{register_url}</a>
              </p>

              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 20px;">

              <!-- Footer Security & Support Info -->
              <p style="font-size: 11px; color: #94a3b8; margin: 0 0 8px; line-height: 1.5;">
                • Thư mời này được tạo riêng cho địa chỉ email <strong>{recipient_email}</strong>. Vui lòng không chia sẻ liên kết kích hoạt này cho người ngoài tổ chức.<br>
                • Nếu bạn không phải là nhân sự thuộc {organization_name}, bạn có thể an tâm bỏ qua thông báo này.
              </p>
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                © 2026 <strong>Axiom Enterprise Meeting Protocol</strong>. All rights reserved.<br>
                Hệ thống bảo mật dữ liệu cấp chính phủ và tập đoàn đa quốc gia.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def send_org_invitation_email(
    recipient_email: str,
    recipient_name: str | None,
    organization_name: str,
    inviter_name: str,
    inviter_email: str,
    department_name: str | None,
    job_title: str | None,
    role_name: str,
    register_url: str,
    expires_at_str: str,
    invite_code: str | None = None,
) -> dict:
    """
    Renders and sends the professional invitation email via SMTP.
    Falls back gracefully if SMTP is not configured in current environment.
    """
    settings = get_settings()

    html_content = render_org_invitation_email(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        organization_name=organization_name,
        inviter_name=inviter_name,
        inviter_email=inviter_email,
        department_name=department_name,
        job_title=job_title,
        role_name=role_name,
        register_url=register_url,
        expires_at_str=expires_at_str,
        invite_code=invite_code,
    )

    code_suffix = f" [Mã mời: {invite_code}]" if invite_code else ""
    subject = f"Lời mời chính thức gia nhập {organization_name}{code_suffix} — Axiom Enterprise"

    # Check if SMTP credentials are provided
    if settings.smtp_user and settings.smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = recipient_email

            part_html = MIMEText(html_content, "html", "utf-8")
            msg.attach(part_html)

            logger.info(
                f"[EmailService] Connecting to SMTP {settings.smtp_host}:{settings.smtp_port} to invite {recipient_email}..."
            )
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                clean_user = settings.smtp_user.strip()
                clean_pass = settings.smtp_password.replace(" ", "").strip()
                server.login(clean_user, clean_pass)
                server.sendmail(settings.smtp_from_email, [recipient_email], msg.as_string())

            logger.info(f"[EmailService] Successfully sent invitation email to {recipient_email}")
            return {
                "sent": True,
                "recipient": recipient_email,
                "register_url": register_url,
                "mode": "smtp",
            }
        except Exception as e:
            logger.warning(
                f"[EmailService] SMTP send failed: {e}. Falling back to preview link mode."
            )

    # Fallback mode (Development / Simulated email delivery)
    logger.info("=" * 60)
    logger.info(f"[EmailService DEV] INVITATION DISPATCHED TO: {recipient_email}")
    logger.info(f"[EmailService DEV] Subject: {subject}")
    logger.info(f"[EmailService DEV] Register Activation Link: {register_url}")
    logger.info("=" * 60)

    return {
        "sent": False,
        "recipient": recipient_email,
        "register_url": register_url,
        "mode": "simulated",
        "note": "Email logged to console. Configure SMTP in .env for direct Gmail transmission.",
    }


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
