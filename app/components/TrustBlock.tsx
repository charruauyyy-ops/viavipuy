function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="vv-trust-icon-svg"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="vv-trust-icon-svg"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="vv-trust-icon-svg"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

const TRUST_ITEMS = [
  {
    icon: <LockIcon />,
    title: "Perfiles verificados",
    text: "Validamos cuentas para mayor confianza.",
  },
  {
    icon: <ChatIcon />,
    title: "Comunidad activa",
    text: "Opiniones reales de usuarios.",
  },
  {
    icon: <StarIcon />,
    title: "Experiencia VIAVIP",
    text: "Contacto directo y rápido.",
  },
];

export default function TrustBlock() {
  return (
    <section
      className="vv-trust"
      style={{ padding: "10px 16px 8px" }}
      data-testid="trust-block"
    >
      <div className="vv-trust-grid" style={{ gap: 10 }}>
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.title}
            className="vv-trust-item"
            style={{ padding: "10px 6px 8px" }}
          >
            <div
              className="vv-trust-icon"
              style={{ width: 28, height: 28, marginBottom: 6 }}
            >
              {item.icon}
            </div>
            <h3
              className="vv-trust-title"
              style={{ fontSize: "10px", marginBottom: 2 }}
            >
              {item.title}
            </h3>
            <p className="vv-trust-text" style={{ fontSize: "9px" }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
