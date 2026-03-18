import "../../styles/admin-panel.css";

export default function AdminLayout({
  title,
  subtitle,
  setCurrentPage,
  actions,
  children,
}) {
  return (
    <main className="admin-page">
      <header className="admin-page-head">
        <div>
          <button
            type="button"
            className="admin-back-btn"
            onClick={() => setCurrentPage("adminpanel")}
          >
            Back to dashboard
          </button>
          <h1>{title}</h1>
          {subtitle ? <p className="admin-page-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="admin-page-actions">{actions}</div> : null}
      </header>
      <section className="admin-page-body">{children}</section>
    </main>
  );
}
