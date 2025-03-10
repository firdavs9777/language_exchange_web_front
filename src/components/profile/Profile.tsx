import React, { useEffect, useState } from "react";
import {
  useGetFollowersQuery,
  useGetFollowingsQuery,
  useGetUserProfileQuery,
  useUploadUserPhotoMutation,
  useUpdateUserInfoMutation,
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
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ISO6391 from "iso-639-1"; // No need to instantiate the class
export interface Moment {
  count: number;
  success: string;
  data: MomentType[];
}

const ProfileScreen: React.FC = () => {
  const { data, isLoading, error, refetch } = useGetUserProfileQuery({});

  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const { data: followers } = useGetFollowersQuery({ userId });
  const { data: followings } = useGetFollowingsQuery({ userId });
  const { data: moments } = useGetMyMomentsQuery({ userId });
  const [uploadUserPhoto] = useUploadUserPhotoMutation();
  const [updateUserProfile] = useUpdateUserInfoMutation();

  const followersDataMain = followers as FollowerInterface;
  const followingsDataMain = followings as FollowerInterface;
  const momentsData = moments as Moment;
  console.log(momentsData);
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
  const [birthDate, setBirthDate] = useState<Date | null>(null);

  const [editMode, setEditMode] = useState<
    "personal" | "bio" | "languages" | null
  >(null);

  useEffect(() => {
    if (data && data.data) {
      setFormData(data.data);
      if (
        data.data.birth_year &&
        data.data.birth_month &&
        data.data.birth_day
      ) {
        const year = parseInt(data.data.birth_year);
        const month = parseInt(data.data.birth_month) - 1; // Month is 0-indexed
        const day = parseInt(data.data.birth_day);

        if (
          !isNaN(year) &&
          !isNaN(month) &&
          !isNaN(day) &&
          month >= 0 &&
          month <= 11 &&
          day >= 1 &&
          day <= 31
        ) {
          setBirthDate(new Date(year, month, day));
        } else {
          console.error("Invalid date components:", data.data);
          setBirthDate(null); // Set to null if invalid
        }
      } else {
        setBirthDate(null);
      }
    }
  }, [data]);

  const [showModal, setShowModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleUploadImages = async (newFiles: File[]) => {
    try {
      const formData = new FormData();
      newFiles.forEach((file) => {
        formData.append("file", file);
      });

      if (newFiles.length > 0 && userId) {
        await uploadUserPhoto({
          userId: userId,
          imageFiles: formData,
        }).unwrap();
        refetch();
      }
      toast.success("Profile Image updated successfully");
    } catch (error) {
      toast.error(
        `Error Occurred, Please upload a file properly ${error?.error}`
      );
    }
  };

  const handleProfileUpdate = async () => {
    try {
      console.log(formData.name);
      const response = await updateUserProfile(formData).unwrap();
      console.log(response);
      toast.success("Profile updated successfully");
      setEditMode(null);
      refetch();
    } catch (error) {
      toast.error(`Error updating profile: ${error?.error}`);
    }
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
  if (error) return <div>Error loading user profile</div>;
  if (!data) return <div>No user profile data available</div>;

  const handleSaveChanges = async () => {
    await handleProfileUpdate();
  };

  const handleCancelChanges = () => {
    setEditMode(null);
    if (data) {
      setFormData(data.data);
    }
  };
  
  const languageOptions = ISO6391.getAllCodes().map((code) => ({
    value: code,
    label: ISO6391.getName(code),
  }));
  const handleBirthDateChange = (date: Date | null) => {
    if (date) {
      setBirthDate(date);
      setFormData((prev) => ({
        ...prev,
        birth_year: String(date.getFullYear()),
        birth_month: String(date.getMonth() + 1),
        birth_day: String(date.getDate()),
      }));
    } else {
      setBirthDate(null);
      setFormData((prev) => ({
        ...prev,
        birth_year: "",
        birth_month: "",
        birth_day: "",
      }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const getOrdinalSuffix = (day: string): string => {
    const n = parseInt(day);
    if (isNaN(n)) return day; // Return original if not a number

    if (n >= 11 && n <= 13) {
      return `${n}th`;
    }
    switch (n % 10) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
    }
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
            onClick={() => handleImageClick(0)}
            style={{ cursor: "pointer" }}
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
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled={true}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Gender</Form.Label>
                    <Form.Select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Birthday</Form.Label>
                      <br/>
                      <DatePicker
                        selected={birthDate}
                        onChange={handleBirthDateChange}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select Date"
                        className="custom-datepicker" // Add Bootstrap styling
                        aria-label="Birthday date picker" // Add accessibility label
                      />
                    </Form.Group>
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
                    {`${getOrdinalSuffix(formData.birth_day)} of ${new Date(
                      formData.birth_year,
                      formData.birth_month - 1
                    ).toLocaleString("en-US", { month: "long" })}, ${
                      formData.birth_year
                    }`}
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
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
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
                    <Form.Select
                                   name="native_language"  
                                  value={formData.native_language}
                                  onChange={handleInputChange}
                                  required
                                >
                                  <option value="">Select Native Language</option>
                                  {languageOptions.map((lang) => (
                                    <option key={lang.value} value={lang.label}>
                                      {lang.label}
                                    </option>
                                  ))}
                                </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Language to Learn</Form.Label>
                    <Form.Select
                       name="language_to_learn"  
                                  value={formData.language_to_learn}
                                  onChange={handleInputChange}
                                  required
                                >
                                  <option value="">Select Language to learn</option>
                                  {languageOptions.map((lang) => (
                                    <option key={lang.value} value={lang.label}>
                                      {lang.label}
                                    </option>
                                  ))}
                                </Form.Select>
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
