const containerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "12px",
};

const groupStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const inputStyle = {
  width: "88px",
  padding: "0.45rem 0.6rem",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "0.88rem",
};

const buttonStyle = {
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "0.45rem 0.9rem",
  background: "#fff",
  color: "#374151",
  fontWeight: 600,
  cursor: "pointer",
};

const disabledButtonStyle = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

export default function TablePaginationControls({
  currentPage,
  endItem,
  handlePageSizeBlur,
  pageSizeInput,
  setCurrentPage,
  setPageSizeInput,
  startItem,
  totalItems,
  totalPages,
}) {
  if (!totalItems) return null;

  return (
    <div style={containerStyle}>
      <div style={groupStyle}>
        <label
          htmlFor={`page-size-${totalPages}-${totalItems}`}
          style={{ fontSize: "0.88rem", color: "#4b5563", fontWeight: 600 }}
        >
          Entries
        </label>
        <input
          id={`page-size-${totalPages}-${totalItems}`}
          type="number"
          min="1"
          step="1"
          value={pageSizeInput}
          onChange={(event) => setPageSizeInput(event.target.value)}
          onBlur={handlePageSizeBlur}
          style={inputStyle}
        />
      </div>

      <div style={groupStyle}>
        <span style={{ fontSize: "0.88rem", color: "#4b5563" }}>
          {startItem}-{endItem} of {totalItems}
        </span>
        <button
          type="button"
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={currentPage <= 1}
          style={currentPage <= 1 ? disabledButtonStyle : buttonStyle}
        >
          Previous
        </button>
        <span style={{ fontSize: "0.88rem", color: "#4b5563" }}>
          Page {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() =>
            setCurrentPage((page) => Math.min(totalPages, page + 1))
          }
          disabled={currentPage >= totalPages}
          style={currentPage >= totalPages ? disabledButtonStyle : buttonStyle}
        >
          Next
        </button>
      </div>
    </div>
  );
}
