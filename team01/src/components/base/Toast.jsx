import ReactDOM from "react-dom";

const Toast = ({ message }) => {
    if (!message) return null;

    return ReactDOM.createPortal(
        <div
            style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                background: "#d4edda",
                color: "#155724",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                zIndex: 9999,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                border: "1px solid #c3e6cb",
            }}
        >
            ✅ {message}
        </div>,
        document.getElementById("toast-root")
    );
};

export default Toast;