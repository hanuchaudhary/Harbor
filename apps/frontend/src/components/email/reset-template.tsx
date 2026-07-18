interface PasswordResetEmailTemplateProps {
  email: string;
  resetUrl: string;
}

export function PasswordResetEmailTemplate({
  email,
  resetUrl,
}: PasswordResetEmailTemplateProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const logoUrl = `${appUrl}/logo.svg`;

  return (
    <div
      style={{
        fontFamily:
          "'Inter', 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: "#f7f7f8",
        color: "#0d0d0d",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          border: "1px solid #e7e7e9",
          // borderRadius: "12px",
          padding: "28px",
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            {appUrl ? (
              <img
                src={logoUrl}
                alt="Harbor"
                width={24}
                height={18}
                style={{
                  width: "24px",
                  height: "18px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                }}
              />
            ) : null}
            <h1
              style={{
                fontSize: "18px",
                fontWeight: "700",
                margin: 0,
                color: "#0d0d0d",
              }}
            >
              Harbor
            </h1>
          </div>
          <div
            style={{
              height: "3px",
              width: "60px",
              backgroundColor: "#dc2626",
              // borderRadius: "99px",
            }}
          />
        </div>

        <div
          style={{
            marginBottom: "32px",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "700",
              marginBottom: "12px",
              color: "#0d0d0d",
            }}
          >
            Reset Your Password
          </h2>

          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              marginBottom: "16px",
              color: "#4b5563",
            }}
          >
            Hello,
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              marginBottom: "16px",
              color: "#4b5563",
            }}
          >
            We received a request to reset the password for your account (
            {email}
            ). Click the button below to choose a new password.
          </p>

          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              marginBottom: "24px",
              color: "#4b5563",
            }}
          >
            This link will expire in 1 hour for security reasons.
          </p>

          <div
            style={{
              marginBottom: "24px",
            }}
          >
            <a
              href={resetUrl}
              style={{
                display: "inline-block",
                padding: "12px 22px",
                backgroundColor: "#111827",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                // borderRadius: "8px",
              }}
            >
              Reset Password
            </a>
          </div>

          <p
            style={{
              fontSize: "12px",
              lineHeight: "1.6",
              marginBottom: "16px",
              color: "#6b7280",
            }}
          >
            Or copy and paste this URL into your browser:
          </p>

          <p
            style={{
              fontSize: "12px",
              lineHeight: "1.6",
              marginBottom: "24px",
              color: "#111827",
              backgroundColor: "#f3f4f6",
              border: "1px solid #e5e7eb",
              // borderRadius: "8px",
              padding: "10px",
              wordBreak: "break-all",
            }}
          >
            {resetUrl}
          </p>

          <div
            style={{
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                lineHeight: "1.6",
                color: "#6b7280",
              }}
            >
              If you didn't request a password reset, please ignore this email
              or contact support if you have concerns.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "8px",
            }}
          >
            Best regards,
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "#111827",
              fontWeight: "600",
            }}
          >
            The Harbor Team
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            lineHeight: "1.6",
          }}
        >
          This email was sent from Harbor
          <br />
          If you have questions, please contact support
        </p>
      </div>
    </div>
  );
}
