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
        "MANAGER": "Trưởng Bộ Phận / Quản Lý (MANAGER)",
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


def render_recruitment_invitation_email(
    candidate_name: str,
    opening_title: str,
    organization_name: str,
    portal_url: str,
    expires_at_str: str,
) -> str:
    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Lời mời tham gia ứng tuyển: {opening_title} — {organization_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; border-bottom: 3px solid #2563eb;">
              <h1 style="margin: 0; font-size: 20px; color: #ffffff;">Cổng Ứng Tuyển — {organization_name}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 15px; margin: 0 0 16px;">Xin chào <strong>{candidate_name}</strong>,</p>
              <p style="font-size: 14px; color: #334155; margin: 0 0 20px;">
                Bạn đã được mời tham gia quy trình tuyển dụng cho vị trí <strong>{opening_title}</strong> tại <strong>{organization_name}</strong>.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="{portal_url}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                  Truy Cập Cổng Ứng Viên
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
                Liên kết này có hiệu lực đến: <strong>{expires_at_str}</strong>. Vui lòng không chia sẻ liên kết này.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_recruitment_invitation_email(
    candidate_email: str,
    candidate_name: str,
    opening_title: str,
    organization_name: str,
    portal_url: str,
    expires_at_str: str,
) -> dict:
    settings = get_settings()
    html_content = render_recruitment_invitation_email(
        candidate_name=candidate_name,
        opening_title=opening_title,
        organization_name=organization_name,
        portal_url=portal_url,
        expires_at_str=expires_at_str,
    )
    subject = f"Lời mời ứng tuyển vị trí {opening_title} — {organization_name}"

    if settings.smtp_user and settings.smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = candidate_email
            part_html = MIMEText(html_content, "html", "utf-8")
            msg.attach(part_html)

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                clean_user = settings.smtp_user.strip()
                clean_pass = settings.smtp_password.replace(" ", "").strip()
                server.login(clean_user, clean_pass)
                server.sendmail(settings.smtp_from_email, [candidate_email], msg.as_string())

            return {"sent": True, "recipient": candidate_email, "mode": "smtp"}
        except Exception as e:
            logger.warning(f"[EmailService] Candidate recruitment email failed via SMTP: {e}")
            return {"sent": False, "recipient": candidate_email, "mode": "failed", "error": str(e)}

    return {"sent": True, "recipient": candidate_email, "mode": "simulated", "portal_url": portal_url}


def send_interview_meeting_notification_email(
    recipient_email: str,
    recipient_name: str,
    recipient_role: str,
    candidate_name: str,
    manager_name: str,
    opening_title: str,
    meeting_title: str,
    meeting_url: str,
    scheduled_at_str: str,
    test_score: float | None = None,
) -> dict:
    """Dispatches interview meeting notification to candidate or manager."""
    settings = get_settings()
    score_badge = f"<span style='display:inline-block;padding:4px 10px;background:#dcfce7;color:#15803d;font-weight:700;border-radius:6px;font-size:12px;'>Điểm bài kiểm tra: {test_score:.0f}%</span>" if test_score is not None else ""
    subject = f"Thông báo lịch phỏng vấn: {opening_title} — {meeting_title}"

    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>{subject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 24px;border-bottom:3px solid #2563eb;color:#ffffff;">
            <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#93c5fd;text-transform:uppercase;">AXIOM DX-OS INTERVIEW PROTOCOL</div>
            <h2 style="margin:8px 0 0;font-size:18px;color:#ffffff;">Thông Báo Lịch Phỏng Vấn Trực Tuyến</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            <p style="margin:0 0 14px;font-size:14px;">Kính gửi <strong>{recipient_name}</strong> ({recipient_role}),</p>
            <p style="margin:0 0 16px;font-size:13px;color:#475569;">
              Ứng viên <strong>{candidate_name}</strong> đã hoàn thành bài test đánh giá năng lực cho vị trí <strong>{opening_title}</strong>. Hệ thống đã tự động thiết lập phòng phỏng vấn trực tuyến với Trưởng bộ phận phụ trách: <strong>{manager_name}</strong>.
            </p>
            {score_badge}
            <div style="margin:20px 0;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;font-size:13px;">
              <p style="margin:0 0 8px;"><strong>Cuộc họp:</strong> {meeting_title}</p>
              <p style="margin:0 0 8px;"><strong>Thời gian:</strong> {scheduled_at_str}</p>
              <p style="margin:0;"><strong>Hình thức:</strong> Trực tuyến bảo mật qua Axiom WebRTC Meeting</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="{meeting_url}" style="background-color:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:10px;font-weight:700;font-size:13px;display:inline-block;">
                Tham Gia Phòng Họp Ngay
              </a>
            </div>
            <p style="font-size:11px;color:#64748b;margin:0;">Hoặc truy cập trực tiếp đường dẫn: <a href="{meeting_url}" style="color:#2563eb;">{meeting_url}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    if settings.smtp_user and settings.smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = recipient_email
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.smtp_user.strip(), settings.smtp_password.replace(" ", "").strip())
                server.sendmail(settings.smtp_from_email, [recipient_email], msg.as_string())
            return {"sent": True, "recipient": recipient_email, "mode": "smtp"}
        except Exception as e:
            logger.warning(f"[EmailService] Meeting notification failed: {e}")
            return {"sent": False, "recipient": recipient_email, "mode": "failed", "error": str(e)}

    return {"sent": True, "recipient": recipient_email, "mode": "simulated", "meeting_url": meeting_url}


def send_candidate_rejection_email(
    candidate_email: str,
    candidate_name: str,
    opening_title: str,
    organization_name: str = "Axiom Enterprise",
    reason: str | None = None,
) -> dict:
    """Dispatches a thoughtful, polite and professional rejection email to candidate."""
    settings = get_settings()
    subject = f"Thông báo kết quả ứng tuyển vị trí {opening_title} — {organization_name}"
    reason_section = (
        f"""<div style="margin:16px 0;background:#f8fafc;padding:14px;border-radius:10px;border-left:4px solid #94a3b8;font-size:12.5px;color:#475569;">
            <strong>Phản hồi từ Hội Đồng Tuyển Dụng:</strong> {reason}
        </div>"""
        if reason
        else ""
    )

    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>{subject}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 24px;border-bottom:3px solid #64748b;color:#ffffff;">
            <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#cbd5e1;text-transform:uppercase;">{organization_name} RECRUITMENT</div>
            <h2 style="margin:8px 0 0;font-size:18px;color:#ffffff;">Thư Cảm Ơn & Thông Báo Kết Quả Ứng Tuyển</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            <p style="margin:0 0 14px;font-size:14px;">Kính gửi <strong>{candidate_name}</strong>,</p>
            <p style="margin:0 0 14px;font-size:13px;color:#475569;line-height:1.6;">
              Lời đầu tiên, Ban Tuyển Dụng <strong>{organization_name}</strong> xin chân thành cảm ơn bạn đã quan tâm và dành thời gian ứng tuyển vào vị trí <strong>{opening_title}</strong>.
            </p>
            <p style="margin:0 0 14px;font-size:13px;color:#475569;line-height:1.6;">
              Sau khi xem xét kỹ lưỡng hồ sơ và các vòng đánh giá, chúng tôi rất tiếc phải thông báo rằng hiện tại hồ sơ của bạn chưa thật sự tương thích tối ưu với các tiêu chí đặc thù của đợt tuyển dụng này.
            </p>
            {reason_section}
            <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.6;">
              Chúng tôi đánh giá rất cao năng lực và sự tâm huyết của bạn. Thông tin của bạn sẽ được lưu trữ an toàn trong kho dữ liệu nhân tài (Talent Pool) của {organization_name} để chúng tôi chủ động liên hệ khi có cơ hội nghề nghiệp phù hợp hơn trong tương lai.
            </p>
            <p style="margin:20px 0 0;font-size:13px;color:#1e293b;font-weight:600;">
              Chúc bạn luôn nhiều năng lượng, thành công và tiếp tục phát triển vượt bậc trên con đường sự nghiệp!
            </p>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;">
              Trân trọng,<br/>
              <strong>Hội đồng Tuyển dụng {organization_name}</strong>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    if settings.smtp_user and settings.smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = candidate_email
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.smtp_user.strip(), settings.smtp_password.replace(" ", "").strip())
                server.sendmail(settings.smtp_from_email, [candidate_email], msg.as_string())
            return {"sent": True, "recipient": candidate_email, "mode": "smtp"}
        except Exception as e:
            logger.warning(f"[EmailService] Candidate rejection email failed: {e}")
            return {"sent": False, "recipient": candidate_email, "mode": "failed", "error": str(e)}

    return {"sent": True, "recipient": candidate_email, "mode": "simulated"}


def render_candidate_cv_approved_email(
    candidate_name: str,
    opening_title: str,
    organization_name: str,
    test_url: str,
    requires_test: bool = True,
) -> str:
    """Renders congratulations HTML email when candidate passes CV screening."""
    test_section = (
        f"""<div style="margin: 20px 0; background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 18px 20px;">
            <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #5b21b6;">
              📝 Vòng 2: Bài Kiểm Tra Năng Lực Trực Tuyến
            </p>
            <p style="margin: 0 0 16px; font-size: 13px; color: #4c1d95; line-height: 1.6;">
              Hệ thống đã tự động kích hoạt bài kiểm tra đánh giá năng lực chuyên môn cho hồ sơ của bạn. Vui lòng truy cập cổng ứng viên để hoàn thành bài test trong thời gian sớm nhất.
            </p>
            <div style="text-align: center; margin: 16px 0;">
              <a href="{test_url}" style="background-color: #7c3aed; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 13px; display: inline-block;">
                Bắt Đầu Làm Bài Test Ngay
              </a>
            </div>
            <p style="margin: 0; font-size: 11.5px; color: #6d28d9; text-align: center;">
              Hoặc truy cập: <a href="{test_url}" style="color: #6d28d9;">{test_url}</a>
            </p>
        </div>"""
        if requires_test
        else f"""<div style="margin: 20px 0; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px;">
            <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #166534;">
              🎯 Vòng Tiếp Theo: Phỏng Vấn Trực Tuyến
            </p>
            <p style="margin: 0; font-size: 13px; color: #15803d; line-height: 1.6;">
              Hồ sơ của bạn không yêu cầu bài test đầu vào. Ban tuyển dụng sẽ sắp xếp buổi phỏng vấn trực tuyến và gửi thông báo lịch hẹn qua email này.
            </p>
        </div>"""
    )

    return f"""<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Chúc mừng! Hồ sơ CV của bạn đã được phê duyệt</title></head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <tr>
          <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; border-bottom: 3px solid #7c3aed; color: #ffffff;">
            <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #c4b5fd; text-transform: uppercase;">{organization_name} RECRUITMENT PROTOCOL</div>
            <h2 style="margin: 8px 0 0; font-size: 18px; color: #ffffff;">Hồ Sơ CV Của Bạn Đã Được Phê Duyệt! 🎉</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px;">
            <p style="margin: 0 0 14px; font-size: 14px;">Kính gửi <strong>{candidate_name}</strong>,</p>
            <p style="margin: 0 0 14px; font-size: 13px; color: #475569; line-height: 1.6;">
              Ban Tuyển Dụng <strong>{organization_name}</strong> xin chúc mừng bạn! Hồ sơ ứng tuyển của bạn cho vị trí <strong>{opening_title}</strong> đã xuất sắc vượt qua vòng thẩm định sơ bộ ban đầu.
            </p>
            {test_section}
            <p style="margin: 16px 0 0; font-size: 13px; color: #475569; line-height: 1.6;">
              Chúc bạn tự tin và đạt kết quả tốt nhất ở các vòng tiếp theo!
            </p>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
              Trân trọng,<br/>
              <strong>Hội đồng Tuyển dụng {organization_name}</strong>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_candidate_cv_approved_email(
    candidate_email: str,
    candidate_name: str,
    opening_title: str,
    organization_name: str = "Axiom Enterprise",
    test_url: str = "http://localhost:3001/candidate/discovery?tab=applications",
    requires_test: bool = True,
) -> dict:
    """Dispatches email notification with test link when CV is approved."""
    settings = get_settings()
    subject = f"Chúc mừng hồ sơ CV đã được phê duyệt: {opening_title} — {organization_name}"
    html_content = render_candidate_cv_approved_email(
        candidate_name=candidate_name,
        opening_title=opening_title,
        organization_name=organization_name,
        test_url=test_url,
        requires_test=requires_test,
    )

    if settings.smtp_user and settings.smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = candidate_email
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.smtp_user.strip(), settings.smtp_password.replace(" ", "").strip())
                server.sendmail(settings.smtp_from_email, [candidate_email], msg.as_string())
            return {"sent": True, "recipient": candidate_email, "mode": "smtp"}
        except Exception as e:
            logger.warning(f"[EmailService] Candidate CV approved email failed: {e}")
            return {"sent": False, "recipient": candidate_email, "mode": "failed", "error": str(e)}

    return {"sent": True, "recipient": candidate_email, "mode": "simulated"}


def render_public_application_received_email(
    candidate_name: str,
    opening_title: str,
    organization_name: str,
    tracking_code: str,
    track_url: str,
    assessment_url: str | None = None,
    requires_test: bool = False,
) -> str:
    """Renders confirmation email for public candidate application submission."""
    display_name = candidate_name.strip() if candidate_name and candidate_name.strip() else "Ứng viên"

    test_section = ""
    if requires_test and assessment_url:
        test_section = f"""
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fdf4ff; border: 1.5px solid #d8b4fe; border-radius: 14px; margin: 24px 0; padding: 20px;">
          <tr>
            <td>
              <div style="font-size: 13px; font-weight: 800; color: #7e22ce; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                📝 Bước 2: Bài Kiểm Tra Năng Lực Đầu Vào (Assessment Test)
              </div>
              <p style="font-size: 13px; color: #581c87; margin: 0 0 16px; line-height: 1.5;">
                Vị trí này yêu cầu hoàn thành bài kiểm tra trực tuyến. Bạn có thể làm bài bất kỳ lúc nào qua đường link bảo mật dưới đây (không cần đăng nhập tài khoản):
              </p>
              <div style="text-align: center;">
                <a href="{assessment_url}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 14px rgba(147, 51, 234, 0.35);">
                  Làm Bài Kiểm Tra Ngay &rarr;
                </a>
              </div>
            </td>
          </tr>
        </table>
        """

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận tiếp nhận hồ sơ ứng tuyển — {organization_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #090d16 0%, #1e293b 100%); padding: 32px 28px; text-align: left; border-bottom: 3px solid #3b82f6;">
              <div style="display: inline-block; padding: 4px 10px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(147, 197, 253, 0.3); border-radius: 6px; color: #93c5fd; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
                AXIOM DIGITAL ENTERPRISE
              </div>
              <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #ffffff;">
                Xác Nhận Tiếp Nhận Hồ Sơ Ứng Tuyển
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
                {organization_name} • Hội Đồng Tuyển Dụng & Phát Triển Nhân Tài
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <p style="font-size: 14.5px; margin: 0 0 16px;">
                Kính gửi <strong>{display_name}</strong>,
              </p>
              <p style="font-size: 13.5px; color: #334155; margin: 0 0 20px; line-height: 1.6;">
                Hệ thống tuyển dụng của <strong>{organization_name}</strong> đã tiếp nhận thành công hồ sơ ứng tuyển của bạn cho vị trí:
              </p>
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;">
                <div style="font-size: 15px; font-weight: 800; color: #0f172a;">{opening_title}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 3px;">Tổ chức: {organization_name}</div>
              </div>

              <!-- Tracking Code Box -->
              <div style="background-color: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 20px;">
                <div style="font-size: 11.5px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 1px;">
                  MÃ HỒ SƠ TRA CỨU TIẾN ĐỘ
                </div>
                <div style="font-size: 22px; font-weight: 900; color: #1e3a8a; letter-spacing: 2px; margin: 6px 0 8px; font-family: monospace;">
                  {tracking_code}
                </div>
                <p style="font-size: 12px; color: #475569; margin: 0;">
                  Bạn có thể dùng mã này để tra cứu trạng thái hồ sơ bất kỳ lúc nào trực tiếp trên trang chủ Axiom mà không cần đăng nhập.
                </p>
              </div>

              {test_section}

              <div style="text-align: center; margin-top: 24px;">
                <a href="{track_url}" style="display: inline-block; padding: 11px 24px; background: #0f172a; color: #ffffff; text-decoration: none; font-size: 12.5px; font-weight: 700; border-radius: 10px;">
                  Tra Cứu Tiến Độ Trực Tuyến &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b; text-align: center;">
              Axiom Digital Enterprise • Cổng Tuyển Dụng & Vận Hành Doanh Nghiệp Tự Chủ
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_public_application_received_email(
    candidate_email: str,
    candidate_name: str,
    opening_title: str,
    organization_name: str,
    tracking_code: str,
    track_url: str,
    assessment_url: str | None = None,
    requires_test: bool = False,
) -> dict:
    """Dispatches application confirmation email to public candidate."""
    settings = get_settings()
    subject = f"[{organization_name}] Xác nhận tiếp nhận hồ sơ: {opening_title} (Mã: {tracking_code})"
    html_content = render_public_application_received_email(
        candidate_name=candidate_name,
        opening_title=opening_title,
        organization_name=organization_name,
        tracking_code=tracking_code,
        track_url=track_url,
        assessment_url=assessment_url,
        requires_test=requires_test,
    )

    if settings.smtp_user and settings.smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = candidate_email
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.smtp_user.strip(), settings.smtp_password.replace(" ", "").strip())
                server.sendmail(settings.smtp_from_email, [candidate_email], msg.as_string())
            return {"sent": True, "recipient": candidate_email, "mode": "smtp"}
        except Exception as e:
            logger.warning(f"[EmailService] Public application received email failed: {e}")
            return {"sent": False, "recipient": candidate_email, "mode": "failed", "error": str(e)}

    return {"sent": True, "recipient": candidate_email, "mode": "simulated"}


def render_official_employee_credentials_email(
    candidate_name: str,
    opening_title: str,
    department_name: str,
    organization_name: str,
    login_email: str,
    initial_password: str,
    magic_login_url: str,
    login_url: str,
) -> str:
    """Renders prestigious official appointment letter with generated login credentials."""
    display_name = candidate_name.strip() if candidate_name and candidate_name.strip() else "Nhân viên mới"

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quyết Định Tiếp Nhận & Cấp Tài Khoản Doanh Nghiệp — {organization_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 12px 35px -5px rgba(15, 23, 42, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%); padding: 36px 30px; text-align: left; border-bottom: 3px solid #10b981;">
              <div style="display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 6px; color: #6ee7b7; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;">
                OFFICIAL APPOINTMENT • AXIOM DIGITAL ENTERPRISE
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">
                Thư Chúc Mừng & Cấp Tài Khoản Nội Bộ
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #a7f3d0;">
                Chào mừng bạn chính thức gia nhập {organization_name}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 30px;">
              <p style="font-size: 15px; margin: 0 0 16px;">
                Kính gửi <strong>{display_name}</strong>,
              </p>
              <p style="font-size: 13.5px; color: #334155; margin: 0 0 20px; line-height: 1.6;">
                Ban Điều Hành <strong>{organization_name}</strong> trân trọng chúc mừng bạn đã vượt qua xuất sắc toàn bộ quy trình tuyển dụng và đánh giá năng lực. Bạn đã chính thức được tiếp nhận với thông tin công tác như sau:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; padding: 14px 18px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 120px;">Vị trí công tác:</td>
                  <td style="padding: 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">{opening_title}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Bộ phận:</td>
                  <td style="padding: 6px 0; font-size: 13.5px; font-weight: 700; color: #0f172a;">{department_name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b;">Vai trò hệ thống:</td>
                  <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #059669;">Thành Viên Chính Thức (MEMBER)</td>
                </tr>
              </table>

              <!-- Generated Credentials Box -->
              <div style="background-color: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 800; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                  🔑 THÔNG TIN ĐĂNG NHẬP HỆ THỐNG DOANH NGHIỆP
                </div>
                <div style="margin-bottom: 8px;">
                  <span style="font-size: 12.5px; color: #047857;">Tài khoản đăng nhập:</span>
                  <div style="font-size: 14px; font-weight: 800; color: #064e3b; font-family: monospace; margin-top: 2px;">{login_email}</div>
                </div>
                <div>
                  <span style="font-size: 12.5px; color: #047857;">Mật khẩu khởi tạo:</span>
                  <div style="font-size: 16px; font-weight: 900; color: #064e3b; font-family: monospace; letter-spacing: 1px; margin-top: 2px;">{initial_password}</div>
                </div>
              </div>

              <!-- One-Click Quick Login CTA -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="{magic_login_url}" style="display: inline-block; padding: 13px 32px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-size: 13.5px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                  Đăng Nhập Nhanh Vào Hệ Thống (Không Cần Gõ Mật Khẩu) &rarr;
                </a>
              </div>
              <div style="text-align: center;">
                <a href="{login_url}" style="font-size: 12px; color: #64748b; text-decoration: underline;">
                  Hoặc đăng nhập thủ công tại trang đăng nhập nội bộ
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 30px; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b; text-align: center;">
              Axiom Digital Enterprise • Hệ Thống Điều Hành & Bảo Mật Doanh Nghiệp Tự Chủ
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_official_employee_credentials_email(
    candidate_email: str,
    candidate_name: str,
    opening_title: str,
    department_name: str,
    organization_name: str,
    login_email: str,
    initial_password: str,
    magic_login_url: str,
    login_url: str,
) -> dict:
    """Dispatches official appointment and login credentials to newly hired employee."""
    settings = get_settings()
    subject = f"[{organization_name}] Chúc mừng trúng tuyển & Thông tin tài khoản nhân viên chính thức: {opening_title}"
    html_content = render_official_employee_credentials_email(
        candidate_name=candidate_name,
        opening_title=opening_title,
        department_name=department_name,
        organization_name=organization_name,
        login_email=login_email,
        initial_password=initial_password,
        magic_login_url=magic_login_url,
        login_url=login_url,
    )

    if settings.smtp_user and settings.smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = candidate_email
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.smtp_user.strip(), settings.smtp_password.replace(" ", "").strip())
                server.sendmail(settings.smtp_from_email, [candidate_email], msg.as_string())
            return {"sent": True, "recipient": candidate_email, "mode": "smtp"}
        except Exception as e:
            logger.warning(f"[EmailService] Official credentials email failed: {e}")
            return {"sent": False, "recipient": candidate_email, "mode": "failed", "error": str(e)}

    return {"sent": True, "recipient": candidate_email, "mode": "simulated"}




