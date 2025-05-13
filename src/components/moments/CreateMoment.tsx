import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  Button,
  Form,
  Col,
  Row,
  Container,
  Image,
  Card,
} from "react-bootstrap";
import { Bounce, toast } from "react-toastify";
import {
  useCreateMomentMutation,
  useUploadMomentPhotosMutation,
} from "../../store/slices/momentsSlice";
import Loader from "../Loader";
import { useSelector } from "react-redux";
import { FaTimes, FaPlus } from "react-icons/fa";

interface Moment {
  success: string;
  data: {
    _id: string;
    title: string;
    description: string;
    user: string;
    comments: string[];
    likeCount: number;
    likedUsers: string[];
    slug: string;
    location: { location: string };
    images: string[];
    createdAt: string;
    updatedAt: string;
  };
}

const CreateMoment: React.FC = () => {
  const { t } = useTranslation();
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
  const user = useSelector((state: any) => state.auth.userInfo?.user._id);

  useEffect(() => {
    setIsButtonEnabled(title !== "" && description !== "");
  }, [title, description]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + selectedImages.length > 10) {
      toast.error(t('createMoment.toast.maxImagesError'), {
                autoClose: 3000,
                hideProgressBar: false,
                theme: "dark",
                transition: Bounce,
              });
      return;
    }
    setSelectedImages((prevImages) => [...prevImages, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);
  };

  const handleAddMoreImages = () => {
    if (selectedImages.length >= 10) {
      toast.error(t('createMoment.toast.maxImagesError'), {
                autoClose: 3000,
                hideProgressBar: false,
                theme: "dark",
                transition: Bounce,
              });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prevImages) => prevImages.filter((_, i) => i !== index));
    setImagePreviews((prevPreviews) =>
      prevPreviews.filter((_, i) => i !== index)
    );
    URL.revokeObjectURL(imagePreviews[index]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isButtonEnabled) return;

    try {
      const response = await createMoment({
        title,
        description,
        user,
      }).unwrap();
      const newMoment = response as Moment;

      if (selectedImages.length > 0 && newMoment.data._id) {
        const formData = new FormData();
        selectedImages.forEach((file) => {
          formData.append("file", file);
        });
        await uploadMomentPhotos({
          momentId: newMoment.data._id,
          imageFiles: formData,
        }).unwrap();
      }
      toast.success(t('createMoment.toast.createSuccess'), {
                autoClose: 3000,
                hideProgressBar: false,
                theme: "dark",
                transition: Bounce,
              });
      navigate("/moments");
    } catch (error) {
      toast.error(t('createMoment.toast.createError'), {
                autoClose: 3000,
                hideProgressBar: false,
                theme: "dark",
                transition: Bounce,
              });
    }
  };

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  return (
    <Container>
      <Row className="justify-content-center my-3">
        <Col xs="auto" className="d-flex">
          <h1>{t('createMoment.title')}</h1>
        </Col>
      </Row>
      <Form onSubmit={handleSubmit}>
        <Card className="p-4 shadow-sm mb-4">
          <Form.Group controlId="title" className="mb-4">
            <Form.Label className="fw-bold">
              {t('createMoment.form.titleLabel')}
            </Form.Label>
            <Form.Control
              type="text"
              placeholder={t('createMoment.form.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-1"
              required
            />
          </Form.Group>
          <Form.Group controlId="description" className="mb-4">
            <Form.Label className="fw-bold">
              {t('createMoment.form.descriptionLabel')}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              placeholder={t('createMoment.form.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-1"
              required
            />
          </Form.Group>
          <Form.Group controlId="images" className="mb-4">
            <Form.Label className="fw-bold">
              {t('createMoment.form.imagesLabel')}
            </Form.Label>
            <Form.Text className="d-block mb-3 text-muted">
              {t('createMoment.form.maxImagesText')}
            </Form.Text>

            {imagePreviews.length > 0 && (
              <Row className="g-3 mb-3">
                {imagePreviews.map((preview, index) => (
                  <Col key={index} xs={6} md={4} lg={3}>
                    <div
                      className="position-relative"
                      style={{ height: "150px" }}
                    >
                      <Image
                        src={preview}
                        className="w-100 h-100 rounded border"
                        style={{ objectFit: "cover" }}
                        alt={`Preview ${index + 1}`}
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        className="position-absolute top-0 end-0 m-1 rounded-circle"
                        style={{
                          width: "28px",
                          height: "28px",
                          zIndex: 1,
                        }}
                        onClick={() => handleRemoveImage(index)}
                        aria-label="Remove image"
                      >
                        <FaTimes className="position-absolute top-50 start-50 translate-middle" />
                      </Button>
                    </div>
                  </Col>
                ))}

                {imagePreviews.length < 10 && (
                  <Col xs={6} md={4} lg={3}>
                    <div
                      className="border rounded d-flex align-items-center justify-content-center bg-light"
                      style={{
                        height: "150px",
                        cursor: "pointer",
                        borderStyle: "dashed",
                      }}
                      onClick={handleAddMoreImages}
                      role="button"
                      aria-label="Add more images"
                    >
                      <div className="text-center text-muted">
                        <div className="mb-2">
                          <FaPlus size={24} />
                        </div>
                        <div>{t('createMoment.form.addMoreText')}</div>
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            )}

            {selectedImages.length === 0 && (
              <div className="mb-3">
                <Form.Control
                  type="file"
                  multiple
                  onChange={handleImageUpload}
                  className="border-1"
                  accept="image/*"
                />
              </div>
            )}

            <Form.Control
              type="file"
              multiple
              onChange={handleImageUpload}
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*"
            />
          </Form.Group>
        </Card>

        <Row className="justify-content-center my-4">
          <Col
            xs={12}
            sm="auto"
            className="d-grid gap-2 d-sm-flex mb-2 mb-sm-0"
          >
            <Button
              type="submit"
              disabled={!isButtonEnabled || isCreating || isUploading}
              variant="primary"
              className="px-4 py-2"
            >
              {isCreating || isUploading 
                ? t('createMoment.form.submittingButton') 
                : t('createMoment.form.submitButton')}
            </Button>

            <Button
              type="button"
              variant="outline-secondary"
              className="px-4 py-2"
              onClick={() => navigate(-1)}
            >
              {t('createMoment.form.cancelButton')}
            </Button>
          </Col>
        </Row>
        {(isCreating || isUploading) && <Loader />}
      </Form>
    </Container>
  );
};

export default CreateMoment;