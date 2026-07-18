interface EmailTemplateProps {
  email: string;
  projectName: string;
  inviteToken: string;
  expiryDate: string;
  role: string;
}

export function InviteTemplate({
  email,
  projectName,
  inviteToken,
  expiryDate,
  role,
}: EmailTemplateProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const inviteUrl = `${appUrl}/accept-invite?token=${inviteToken}`;
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
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "700",
              lineHeight: "1.35",
              margin: "0 0 12px 0",
              color: "#0d0d0d",
            }}
          >
            You&apos;ve been invited to join {projectName}
          </h2>

          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#4b5563",
              margin: 0,
            }}
          >
            Accept your invite to access your workspace, collaborate with your
            team, and track project progress in Harbor.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e5e7eb",
            padding: "20px",
            marginBottom: "24px",
            // borderRadius: "10px",
          }}
        >
          <div
            style={{
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#6b7280",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Email
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "#111827",
                fontWeight: "600",
              }}
            >
              {email}
            </span>
          </div>

          <div
            style={{
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#6b7280",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Organization
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "#111827",
                fontWeight: "600",
              }}
            >
              {projectName}
            </span>
          </div>

          <div
            style={{
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "#6b7280",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Role
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "#111827",
                fontWeight: "600",
              }}
            >
              {role}
            </span>
          </div>

          <div>
            <span
              style={{
                fontSize: "12px",
                color: "#6b7280",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Expires
            </span>
            <span
              style={{
                fontSize: "14px",
                color: "#111827",
                fontWeight: "600",
              }}
            >
              {expiryDate}
            </span>
          </div>
        </div>

        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <a
            href={inviteUrl}
            style={{
              display: "inline-block",
              backgroundColor: "#111827",
              color: "#ffffff",
              padding: "12px 22px",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
              // borderRadius: "8px",
            }}
          >
            Accept Invitation
          </a>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#6b7280",
            lineHeight: "1.6",
            paddingTop: "24px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <p style={{ marginBottom: "8px" }}>
            This invitation will expire on {expiryDate}. If you did not expect
            this invitation, you can safely ignore this email.
          </p>
          <p style={{ marginBottom: "8px" }}>
            If the button above doesn&apos;t work, copy and paste this link into
            your browser:
          </p>
          <p
            style={{
              wordBreak: "break-all",
              color: "#111827",
              backgroundColor: "#f3f4f6",
              border: "1px solid #e5e7eb",
              // borderRadius: "8px",
              padding: "10px",
            }}
          >
            {inviteUrl}
          </p>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: "16px",
          fontSize: "12px",
          color: "#9ca3af",
        }}
      >
        <p>© 2026 Harbor. Secure collaboration for product teams.</p>
      </div>
    </div>
  );
}
