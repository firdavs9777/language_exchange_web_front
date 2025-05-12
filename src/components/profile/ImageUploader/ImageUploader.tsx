import React, { useState, useRef } from "react";
import { Modal, Button, Form, Image, Row, Col } from "react-bootstrap";
import { toast } from "react-toastify";
import "./ImageUploader.css";

export interface ImageViewerModalProps {
  images: string[];
  show: boolean;
  onClose: () => void;
  onUploadImages: (files: File[]) => void;
  onDeleteImage?: (index: number) => void;
  onUpdateImage?: (index: number, newFile: File) => void;
}

const ImageUploadModal: React.FC<ImageViewerModalProps> = ({
  images,
  show,
  onClose,
  onUploadImages,
  onDeleteImage,
  onUpdateImage,
}) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 10;
  
  const remainingSlots = MAX_IMAGES - (images.length + selectedImages.length);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const filesArray = Array.from(event.target.files);
      
      if (filesArray.length > remainingSlots) {
        toast.warning(`You can only upload ${remainingSlots} more image(s).`);
        const allowedFiles = filesArray.slice(0, remainingSlots);
        setSelectedImages(prev => [...prev, ...allowedFiles]);
      } else {
        setSelectedImages(prev => [...prev, ...filesArray]);
      }
    }
    // Reset input value to allow selecting same files again
    if (event.target) {
      event.target.value = '';
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files).filter(
        file => file.type.startsWith('image/')
      );
      
      if (filesArray.length === 0) {
        toast.error("Please drop only image files");
        return;
      }
      
      if (filesArray.length > remainingSlots) {
        toast.warning(`You can only upload ${remainingSlots} more image(s).`);
        const allowedFiles = filesArray.slice(0, remainingSlots);
        setSelectedImages(prev => [...prev, ...allowedFiles]);
      } else {
        setSelectedImages(prev => [...prev, ...filesArray]);
      }
    }
  };

  const handleUpload = async() => {
    if (selectedImages.length === 0 && images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

      onUploadImages(selectedImages);
    
    
    setSelectedImages([]);
    onClose();
  };

  const handleDeleteSelected = (index: number) => {
    setSelectedImages(prev => 
      prev.filter((_, i) => i !== index)
    );
    toast.success("Image removed from selection");
  };

  const handleDeleteExisting = (index: number) => {
    if (onDeleteImage) {
      onDeleteImage(index);
      toast.success("Image deleted successfully");
    }
  };

  const handleUpdateExisting = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUpdateImage) {
      onUpdateImage(index, e.target.files[0]);
      toast.success("Image replaced successfully");
      e.target.value = ''; // Reset input
    }
  };

  return (
    <Modal show={show} onHide={onClose} className="image-uploader-section" size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-upload me-2"></i>
          Image Gallery ({images.length + selectedImages.length}/{MAX_IMAGES})
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div className="mb-4">
          <h5>Current Images</h5>
          {images.length > 0 ? (
            <Row className="image-gallery">
              {images.map((item, index) => (
                <Col xs={6} md={4} lg={3} key={`existing-${index}`} className="mb-3">
                  <div className="image-container">
                    <Image
                      src={item}
                      alt={`Uploaded image ${index + 1}`}
                      className="img-thumbnail gallery-image"
                    />
                    <div className="image-actions">
                      <label className="update-btn" title="Replace image">
                        <input
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={(e) => handleUpdateExisting(index, e)}
                        />
                        <Button variant="outline-info" size="sm">Replace</Button>
                      </label>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDeleteExisting(index)}
                        title="Delete image"
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : (
            <p className="text-muted">No images uploaded yet</p>
          )}
        </div>

        <div className="mb-4">
          <h5>New Images {selectedImages.length > 0 && `(${selectedImages.length})`}</h5>
          {selectedImages.length > 0 ? (
            <Row className="image-gallery">
              {selectedImages.map((file, index) => (
                <Col xs={6} md={4} lg={3} key={`new-${index}`} className="mb-3">
                  <div className="image-container">
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={`Selected preview ${index + 1}`}
                      className="img-thumbnail gallery-image"
                    />
                    <div className="image-actions">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteSelected(index)}
                        title="Remove from selection"
                      >
                        <i className="bi bi-x-circle"></i>
                      </Button>
                    </div>
                    <div className="image-name-tag">
                      {file.name.length > 15 
                        ? file.name.substring(0, 12) + '...' 
                        : file.name}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          ) : (
            <p className="text-muted">No new images selected</p>
          )}
        </div>

        {remainingSlots > 0 && (
          <div
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <i className="bi bi-plus-lg upload-icon fs-1"></i>
            <p>Drop images here or</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="d-none"
            />
            <Button 
              variant="outline-primary"
              onClick={triggerFileInput}
            >
              Select Files
            </Button>
            <p className="text-muted mt-2">
              You can add {remainingSlots} more {remainingSlots === 1 ? 'image' : 'images'}
            </p>
          </div>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={handleUpload}
          disabled={selectedImages.length === 0 && images.length === 0}
        >
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImageUploadModal;