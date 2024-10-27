import React, { useState } from "react";
import { Modal, Button, Form, Image } from "react-bootstrap";
import { toast } from "react-toastify";

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
    onUploadImages(selectedImages);
    if (selectedImages.length === 0) {
      toast.error("Please upload image first");
      return;
    }
    setSelectedImages([]);
    setIsInputVisible(true);
    onClose();
  };

  const handleAddImageClick = () => {
    setIsInputVisible(true); // Show the input for adding more images
  };

  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Upload Images</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div
          style={{
            height: "200px",
          }}
        >
          {images.length > 0 ? (
            images.map((item, index) => (
              <Image
                key={index} // Unique key for each image
                src={item}
                alt={`Uploaded image ${index + 1}`} // Descriptive alt text for accessibility
                className="img-thumbnail" // Optional: Add some styling
                style={{ margin: "10px" }} // Optional: Margin between images
              />
            ))
          ) : (
            <p>No images available</p> // Fallback message if no images exist
          )}
        </div>
        <div className="selected-images-preview">
          {selectedImages.length > 0 ? (
            selectedImages.map((file, index) => (
              <div
                key={index}
                className="image-preview"
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Selected preview ${index + 1}`}
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                    marginRight: "10px",
                  }}
                />
                {/* Render "+" button only if more images can be added */}
                {selectedImages.length < 3 && (
                  <Button
                    variant="outline-secondary"
                    onClick={handleAddImageClick}
                  >
                    +
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p>No images selected</p>
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
          Upload
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImageUploadModal;
