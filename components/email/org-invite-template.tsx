interface OrgInviteEmailProps {
  email: string;
  organizationName: string;
  invitedByUsername: string;
  inviteLink: string;
  role: string;
}

export function OrgInviteEmailTemplate({
  email,
  organizationName,
  invitedByUsername,
  inviteLink,
  role,
}: OrgInviteEmailProps) {
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
          padding: "28px",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          {appUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Harbor" width={24} height={18} />
          ) : null}
          <span style={{ fontWeight: 600, fontSize: "16px" }}>Harbor</span>
        </div>
        <h1 style={{ fontSize: "20px", margin: "0 0 12px", fontWeight: 600 }}>
          Join {organizationName}
        </h1>
        <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#52525b" }}>
          {invitedByUsername} invited {email} to join{" "}
          <strong style={{ color: "#0d0d0d" }}>{organizationName}</strong> as{" "}
          {role.replaceAll("_", " ").toLowerCase()}.
        </p>
        <a
          href={inviteLink}
          style={{
            display: "inline-block",
            marginTop: "20px",
            padding: "12px 18px",
            backgroundColor: "#0d0d0d",
            color: "#ffffff",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Accept invitation
        </a>
      </div>
    </div>
  );
}
