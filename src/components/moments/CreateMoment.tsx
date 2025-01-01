import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { Button, Form, Col, Row, Container, Image } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  useCreateMomentMutation,
  useUploadMomentPhotosMutation,
} from "../../store/slices/momentsSlice";
import Loader from "../Loader";
import { FaPlus, FaTimes } from "react-icons/fa";
import { useSelector } from "react-redux";

// TypeScript interfaces for the API response

const CreateMoment: React.FC = () => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isButtonEnabled, setIsButtonEnabled] = useState<boolean>(false);

  const navigate = useNavigate();
  const [createMoment, { isLoading: isCreating }] = useCreateMomentMutation();
  const [uploadMomentPhotos, { isLoading: isUploading }] =
    useUploadMomentPhotosMutation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsButtonEnabled(title !== "" && description !== "");
  }, [title, description]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedImages((prevImages) => [...prevImages, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);
  };

  const handleAddMoreImages = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prevImages) => prevImages.filter((_, i) => i !== index));
    setImagePreviews((prevPreviews) =>
      prevPreviews.filter((_, i) => i !== index)
    );
  };
  const user = useSelector((state: any) => state.auth.userInfo?.user._id);

  interface Moment {
    success: string;
    data: {
      _id: string;
      title: string;
      description: string;
      user: string; // Assuming user is a string; adjust if it's an object
      comments: string[]; // Array of comment IDs
      likeCount: number;
      likedUsers: string[];
      slug: string;
      location: { location: string };
      images: string[];
      createdAt: string; // ISO date string
      updatedAt: string;
    };
    // ISO date string
  }
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isButtonEnabled) {
      try {
        // Create the moment
        const response = await createMoment({
          title,
          description,
          user,
        }).unwrap();
        const newMoment = response as Moment;

        if (selectedImages.length > 0 && newMoment.data._id) {
          const formData = new FormData();
          selectedImages.forEach((file) => {
            formData.append("file", file); // Key should match the backend expectation
          });
          await uploadMomentPhotos({
            momentId: newMoment.data._id, // use `_id` from the response
            imageFiles: formData, // Pass FormData directly
          }).unwrap();
        }
        toast.success("Moment created successfully!");
        navigate("/moments");
      } catch (error) {
        toast.error("Failed to create moment.");
      }
    }
  };

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  return (
    <Container>
      <Row className="justify-content-center my-3">
        <Col xs="auto" className="d-flex">
          <h1>Create Moment</h1>
        </Col>
      </Row>
      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="title" className="my-4">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Form.Group>
        <Form.Group controlId="description" className="my-4">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            placeholder="Enter description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Form.Group>
        <Form.Group controlId="images" className="my-4">
          <Form.Label>Upload Images</Form.Label>
          <div className="mb-2">
            <Row>
              {imagePreviews.map((preview, index) => (
                <Col key={index} xs={4} className="my-2 position-relative">
                  <Image src={preview} thumbnail />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRemoveImage(index)}
                    style={{
                      position: "absolute",
                      right: "1px",
                      height: "30px",
                      width: "40px",
                      borderRadius: "90%",
                      padding: "2px 5px",
                    }}
                  >
                    <FaTimes />
                  </Button>
                </Col>
              ))}
              {selectedImages.length > 0 && (
                <Col
                  xs={4}
                  className="my-1 d-flex align-items-center justify-content-center"
                >
                  <Button variant="light" onClick={handleAddMoreImages}>
                    <FaPlus size={24} color="black" />
                  </Button>
                </Col>
              )}
            </Row>
          </div>
          {selectedImages.length === 0 && (
            <Form.Control type="file" multiple onChange={handleImageUpload} />
          )}
          {/* Hidden file input for adding more images */}
          <Form.Control
            type="file"
            multiple
            onChange={handleImageUpload}
            ref={fileInputRef}
            style={{ display: "none" }}
          />
        </Form.Group>
        <Row className="justify-content-center my-4">
          <Col xs="auto" className="d-flex justify-content-between">
            <Button
              type="submit"
              disabled={!isButtonEnabled || isCreating || isUploading}
              variant="primary"
              className="me-3 py-2 px-6"
            >
              {isCreating || isUploading ? "Posting..." : "Post"}
            </Button>

            <Button type="button" variant="success" className="me-2 py-2 px-6">
              Cancel
            </Button>
          </Col>
        </Row>
        {(isCreating || isUploading) && <Loader />}
      </Form>
    </Container>
  );
};

export default CreateMoment;
