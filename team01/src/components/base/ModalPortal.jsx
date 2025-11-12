import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ModalPortal({ children }) {
  const modalRootId = "modal-root";
  const [container, setContainer] = useState(null);

  useEffect(() => {
    let root = document.getElementById(modalRootId);
    if (!root) {
      root = document.createElement("div");
      root.setAttribute("id", modalRootId);
      document.body.appendChild(root);
    }
    setContainer(root);
  }, []);

  return container ? createPortal(children, container) : null;
}