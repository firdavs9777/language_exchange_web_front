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
      setIsInputVisible(false); // Hide input after selecting files
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

  const handleDeleteImage = (index: number, isSelected: boolean) => {
    console.log(selectedImages);
    console.log(images);
    console.log(isSelected);
    if (isSelected) {
      // Remove the image from the selected images list
      setSelectedImages((prevImages) =>
        prevImages.filter((_, i) => i !== index)
      );
    } else {
      // Remove the image from the uploaded images list
      const imageToDelete = images[index];
      // Add logic to update the images state (if it's coming from the server)
      // Example: onDeleteImage(imageToDelete);

      // If the images array is local, use the setState approach:
      // setImages(prevImages => prevImages.filter((_, i) => i !== index));
    }
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
              <div key={index} className="image-container">
                <Image
                  src={item}
                  alt={`Uploaded image ${index + 1}`}
                  className="img-thumbnail"
                />
                <button
                  className="delete-button"
                  onClick={() => handleDeleteImage(index, true)}
                >
                  X
                </button>
              </div>
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
                <button
                  className="delete-button"
                  onClick={() => handleDeleteImage(index, true)}
                >
                  X
                </button>
              </div>
            ))
          ) : (
            <p>Please select new images</p>
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
              className="file-input"
            />
          </Form.Group>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-center">
        {/* Only show the Upload button when images are selected */}
        {selectedImages.length > 0 && (
          <Button variant="primary" onClick={handleUpload}>
            Upload
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImageUploadModal;
