import React, { useState } from "react";
import { Modal, Button, Form, Image } from "react-bootstrap";
import { toast } from "react-toastify";
import "./ImageUploader.css";

export interface ImageViewerModalProps {
  images: string[];
  show: boolean;
  onClose: () => void;
  onUploadImages: (files: File[]) => void; // Function to handle uploaded images
}

const ImageUploadModal: React.FC<ImageViewerModalProps> = ({
  images,
  show,
  onClose,
  onUploadImages,
}) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isInputVisible, setIsInputVisible] = useState<boolean>(true);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedImages((prevImages) => [...prevImages, ...filesArray]); // Append new files to selected images
      setIsInputVisible(false); // Hide input after first upload
    }
  };

  const handleUpload = () => {
    if (selectedImages.length === 0 && images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }
    onUploadImages(selectedImages);
    setSelectedImages([]);
    setIsInputVisible(true);
    onClose();
  };

  const handleAddImageClick = () => {
    setIsInputVisible(true); // Show the input for adding more images
  };

  return (
    <Modal show={show} onHide={onClose} className="image-uploader-section">
      <Modal.Header closeButton>
        <Modal.Title>Upload Images</Modal.Title>
      </Modal.Header>
      <Modal.Body className="image-main">
        <div className="uploaded-images">
          {images.length > 0 ? (
            images.map((item, index) => (
              <Image
                key={index}
                src={item}
                alt={`Uploaded image ${index + 1}`}
                className="img-thumbnail"
              />
            ))
          ) : (
            <p>No images available</p>
          )}
        </div>
        <div className="selected-images-preview">
          {selectedImages.length > 0 ? (
            selectedImages.map((file, index) => (
              <div key={index} className="image-preview">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Selected preview ${index + 1}`}
                  className="preview-image"
                />
                {/* Render "+" button only if more images can be added */}
              </div>
            ))
          ) : (
            <p>Please select new images</p>
          )}

          {images.length <= 10 ? (
            <Button
              className="add-image"
              variant="outline-secondary"
              onClick={handleAddImageClick}
            >
              +
            </Button>
          ) : (
            <p>You can upload maximum 10 images</p>
          )}
        </div>

        {isInputVisible && (
          <Form.Group controlId="formFileMultiple" className="mb-3">
            <Form.Label>Choose Images</Form.Label>
            <Form.Control
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
            />
          </Form.Group>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleUpload}>
          Apply
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImageUploadModal;
