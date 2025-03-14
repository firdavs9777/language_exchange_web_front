import React from "react";
import { Modal, Button } from "react-bootstrap";

interface GlobalModalProps {
  show: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  footerButtons?: React.ReactNode;
}

const GlobalModal: React.FC<GlobalModalProps> = ({ show, title, children, onClose, footerButtons }) => {
  return (
    <Modal show={show} onHide={onClose} centered>
      {title && (
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
      )}
      <Modal.Body>{children}</Modal.Body>
      {footerButtons && <Modal.Footer>{footerButtons}</Modal.Footer>}
    </Modal>
  );
};

export default GlobalModal;
