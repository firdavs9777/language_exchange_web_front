import React, { useEffect, useRef, useState } from "react";
import {
  useGetFollowersQuery,
  useGetFollowingsQuery,
  useGetUserProfileQuery,
  useUploadUserPhotoMutation,
} from "../../store/slices/usersSlice";
import {
  Button,
  Card,
  Col,
  Container,
  Image,
  Row,
  Form,
} from "react-bootstrap";
import backgroundImage from "../../assets/profile_background.png";
import {
  FaCameraRetro,
  FaEdit,
  FaEye,
  FaSave,
  FaTimes,
  FaUserCheck,
  FaUserFriends,
} from "react-icons/fa";
import "./Profile.css";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useGetMyMomentsQuery } from "../../store/slices/momentsSlice";
import { MomentType } from "../moments/MainMoments";
import { FollowerInterface, UserProfileData } from "./ProfileTypes/types";
import ImageViewerModal from "./ImageViewer/ImageModal";
import ImageUploaderModal from "./ImageUploader/ImageUploader";
import { toast } from "react-toastify";

interface Moment {
  count: number;
  success: string;
  data: MomentType[];
}
const ProfileScreen: React.FC = () => {
  const { data, isLoading, error } = useGetUserProfileQuery({});
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const {
    data: followers,
    isLoading: isLoading_two,
    error: ErrorMessage,
  } = useGetFollowersQuery({ userId });
  const {
    data: followings,
    isLoading: isLoading_three,
    error: ErrorMessageCode,
  } = useGetFollowingsQuery({ userId });
  const {
    data: moments,
    isLoading: momentLoading,
    error: MomentError,
  } = useGetMyMomentsQuery({ userId });
  const [uploadUserPhoto] = useUploadUserPhotoMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const followersDataMain = followers as FollowerInterface;
  const [followersData, setFollowersData] = useState({});
  const followingsDataMain = followings as FollowerInterface;
  const [followingsData, setFollowingsData] = useState({});
  const momentsData = moments as Moment;
  const [momentsMain, setMomentsMain] = useState({});

  const [formData, setFormData] = useState<UserProfileData>({
    _id: "",
    name: "",
    gender: "",
    email: "",
    bio: "",
    birth_year: "",
    birth_month: "",
    birth_day: "",
    image: "",
    native_language: "",
    language_to_learn: "",
    createdAt: "",
    images: [],
    imageUrls: [],
  });
  const [images, setImages] = useState<string[]>();
  const [editMode, setEditMode] = useState<
    "personal" | "bio" | "languages" | null
  >(null);

  useEffect(() => {
    if (data) {
      setFormData(data.data);
    }
    if (followers) {
      setFollowersData(followersDataMain);
    }
    if (followings) {
      setFollowingsData(followingsDataMain);
    }
    if (moments) {
      setMomentsMain(momentsData);
    }
    if (formData) {
      setImages(formData.imageUrls);
    }
  }, [
    data,
    followers,
    followersDataMain,
    followings,
    followingsDataMain,
    moments,
    formData,
  ]);

  const [showModal, setShowModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleUploadImages = async (newFiles: File[]) => {
    // Convert File objects to URLs or any method you prefer for displaying

    try {
      const newImageUrls = newFiles.map((file) => URL.createObjectURL(file));
      setImages((prevImages) => [...prevImages, ...newImageUrls]);

      const formData = new FormData();
      newFiles.forEach((file) => {
        formData.append("file", file); // Append the actual File objects
      });

      // Check if userId is available before making the upload call
      if (newFiles.length > 0 && userId) {
        await uploadUserPhoto({
          userId: userId,
          imageFiles: formData,
        }).unwrap();
      }
      toast.success("Profile Image updated successfully");
    } catch (error) {
      toast.error(
        `Error Occured, Please upload a file properly ${error?.error}`
      );
    }
    // Update the images state
  };

  const handleOpenUploadModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };
  const handleCloseViewer = () => setShowImageViewer(false);
  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  };
  if (isLoading) return <div>Loading...</div>;
  if (isLoading_two) return <div>Loading..</div>;
  if (error) return <div>Error loading user profile</div>;
  if (!data) return <div>No user profile data available</div>;

  const handleSaveChanges = () => {
    setEditMode(null);
    // Implement save logic, e.g., API call to update profile data
  };

  const handleCancelChanges = () => {
    setEditMode(null);
    // Optionally, reset formData to original values if needed
  };

  return (
    <Container fluid className="profile-section">
      {/* Banner Section */}
      <Row className="justify-content-center my-1">
        <Image src={backgroundImage} className="banner" />
        <Col xs="auto" className="d-flex align-items-center">
          <h1 className="profile-heading">My Profile</h1>
        </Col>
      </Row>

      {/* Avatar and Edit Button */}
      <Row className="justify-content-center profile-avatar-section">
        <Col xs="auto" className="text-center">
          <Image
            src={formData.imageUrls[0]}
            alt="User Image"
            roundedCircle
            className="profile-avatar-image"
            onClick={() => handleImageClick(0)} // Open viewer starting from the first image
            style={{ cursor: "pointer" }} // Indicate it's clickable
          />
          <Button
            variant="primary"
            className="profile-avatar-edit"
            onClick={handleOpenUploadModal}
          >
            <FaEdit /> Edit
          </Button>
        </Col>
      </Row>

      <ImageViewerModal
        show={showImageViewer}
        images={formData.imageUrls}
        currentIndex={currentImageIndex}
        onClose={handleCloseViewer}
        onSelectImage={handleImageClick}
      />

      <ImageUploaderModal
        images={formData.imageUrls}
        show={showModal}
        onClose={handleCloseModal}
        onUploadImages={handleUploadImages}
      />

      <Row className="justify-content-center my-4 profile-stats-section">
        <Col md={3} className="text-center">
          <Link to={`/followersList`}>
            <Card className="p-3 shadow-sm profile-stat-card">
              <FaUserFriends className="stat-icon mb-2" />
              <Card.Title className="stat-number">
                {followersDataMain?.count}
              </Card.Title>
              <Card.Text className="stat-text">Followers</Card.Text>
            </Card>
          </Link>
        </Col>

        <Col md={3} className="text-center">
          <Link to={`/followingsList`}>
            <Card className="p-3 shadow-sm profile-stat-card">
              <FaUserCheck className="stat-icon mb-2" />
              <Card.Title className="stat-number">
                {followingsDataMain?.count}
              </Card.Title>
              <Card.Text className="stat-text">Following</Card.Text>
            </Card>
          </Link>
        </Col>
        <Col md={3} className="text-center">
          <Link to={`/my-moments`}>
            <Card className="p-3 shadow-sm profile-stat-card">
              <FaCameraRetro className="stat-icon mb-2" />
              <Card.Title className="stat-number">
                {momentsData?.count}
              </Card.Title>
              <Card.Text className="stat-text">Moments</Card.Text>
            </Card>
          </Link>
        </Col>
        <Col md={3} className="text-center">
          <Card className="p-3 shadow-sm profile-stat-card">
            <FaEye className="stat-icon mb-2" />
            <Card.Title className="stat-number">320</Card.Title>
            <Card.Text className="stat-text">Visitors</Card.Text>
          </Card>
        </Col>
      </Row>

      {/* Profile Information */}
      <Row className="justify-content-center profile-info-section mt-4">
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title className="mb-4">
                <span className="info-heading">Personal Information</span>
                {editMode === "personal" ? (
                  <>
                    <Button
                      variant="link"
                      className="float-end"
                      onClick={handleSaveChanges}
                    >
                      <FaSave /> Save
                    </Button>
                    <Button
                      variant="link"
                      className="float-end me-2"
                      onClick={handleCancelChanges}
                    >
                      <FaTimes /> Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="link"
                    className="float-end"
                    onClick={() => setEditMode("personal")}
                  >
                    <FaEdit /> Edit
                  </Button>
                )}
              </Card.Title>
              {editMode === "personal" ? (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Gender</Form.Label>
                    <Form.Select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          gender: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Birthday</Form.Label>
                    <Form.Control
                      type="text"
                      value={`${formData.birth_day}-${formData.birth_month}-${formData.birth_year}`}
                      onChange={(e) => {
                        const [birth_day, birth_month, birth_year] =
                          e.target.value.split("-");
                        setFormData((prev) => ({
                          ...prev,
                          birth_day,
                          birth_month,
                          birth_year,
                        }));
                      }}
                    />
                  </Form.Group>
                </>
              ) : (
                <>
                  <Card.Text>
                    <strong>Name:</strong> {formData.name}
                  </Card.Text>
                  <Card.Text>
                    <strong>Email:</strong> {formData.email}
                  </Card.Text>
                  <Card.Text>
                    <strong>Gender:</strong> {formData.gender}
                  </Card.Text>
                  <Card.Text>
                    <strong>Birthday:</strong>{" "}
                    {`${formData.birth_day}-${formData.birth_month}-${formData.birth_year}`}
                  </Card.Text>
                </>
              )}
            </Card.Body>
          </Card>

          {/* Bio Section */}
          <Card className="mb-4">
            <Card.Body>
              <Card.Title className="mb-4">
                <span className="info-heading">Bio</span>
                {editMode === "bio" ? (
                  <>
                    <Button
                      variant="link"
                      className="float-end"
                      onClick={handleSaveChanges}
                    >
                      <FaSave /> Save
                    </Button>
                    <Button
                      variant="link"
                      className="float-end me-2"
                      onClick={handleCancelChanges}
                    >
                      <FaTimes /> Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="link"
                    className="float-end"
                    onClick={() => setEditMode("bio")}
                  >
                    <FaEdit /> Edit
                  </Button>
                )}
              </Card.Title>
              {editMode === "bio" ? (
                <Form.Group className="mb-3">
                  <Form.Label>Bio</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                  />
                </Form.Group>
              ) : (
                <Card.Text>{formData.bio}</Card.Text>
              )}
            </Card.Body>
          </Card>

          {/* Language Section */}
          <Card>
            <Card.Body>
              <Card.Title className="mb-4">
                <span className="info-heading">Languages</span>
                {editMode === "languages" ? (
                  <>
                    <Button
                      variant="link"
                      className="float-end"
                      onClick={handleSaveChanges}
                    >
                      <FaSave /> Save
                    </Button>
                    <Button
                      variant="link"
                      className="float-end me-2"
                      onClick={handleCancelChanges}
                    >
                      <FaTimes /> Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="link"
                    className="float-end"
                    onClick={() => setEditMode("languages")}
                  >
                    <FaEdit /> Edit
                  </Button>
                )}
              </Card.Title>
              {editMode === "languages" ? (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Native Language</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.native_language}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          native_language: e.target.value,
                        }))
                      }
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Language to Learn</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.language_to_learn}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          language_to_learn: e.target.value,
                        }))
                      }
                    />
                  </Form.Group>
                </>
              ) : (
                <>
                  <Card.Text>
                    <strong>Native Language:</strong> {formData.native_language}
                  </Card.Text>
                  <Card.Text>
                    <strong>Learning:</strong> {formData.language_to_learn}
                  </Card.Text>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfileScreen;
