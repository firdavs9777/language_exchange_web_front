import React from "react";
import { Modal, Carousel, Image } from "react-bootstrap";
import { ImageViewerModalProps } from "../ProfileTypes/types";
import "./ImageModal.css";
const ImageUploaderModal: React.FC<ImageViewerModalProps> = ({
  show,
  images,
  currentIndex,
  onClose,
  onSelectImage,
}) => {
  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      size="sm"
      className="image-uploader-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title className="text-center">
          Your Current Images: {images.length}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Carousel
          activeIndex={currentIndex}
          onSelect={onSelectImage}
          indicators={false}
        >
          {images.map((url, index) => (
            <Carousel.Item key={index}>
              <Image
                src={url}
                alt={`User Image ${index + 1}`}
                className="d-block w-100 rounded shadow" // Added shadow and rounded corners
              />
            </Carousel.Item>
          ))}
        </Carousel>
      </Modal.Body>
    </Modal>
  );
};

export default ImageUploaderModal;
