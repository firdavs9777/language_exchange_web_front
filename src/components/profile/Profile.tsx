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
  Badge,
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
import ISO6391 from "iso-639-1";

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
    const dispatch = useDispatch();

  const followersDataMain = followers as FollowerInterface;
  const followingsDataMain = followings as FollowerInterface;
  const momentsData = moments as Moment;

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
      const response = await updateUserProfile(formData).unwrap();
      const ActionPayload: Response | any = response.data;
      // console.log(response)
      // console.log("Check hereeeeeee")
      // dispatch(setCredentials({ ...ActionPayload }));
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

  if (isLoading)
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="alert alert-danger m-3">Error loading user profile</div>
    );
  if (!data)
    return (
      <div className="alert alert-warning m-3">
        No user profile data available
      </div>
    );

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
    <Container fluid>
      {/* Banner Section */}
      <Row className="justify-content-center my-1">
        <Col xs={12} className="p-0 mb-5">
          <div
            style={{
              position: "relative",
              height: "180px",
              overflow: "hidden",
            }}
          >
            <Image
              src={backgroundImage}
              style={{ width: "100%", height: "180px", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 10,
              }}
            >
              <h1 className="text-white fw-bold text-center">My Profile</h1>
            </div>
          </div>
        </Col>
      </Row>

      {/* Avatar and Edit Button */}
      <Row className="justify-content-center" style={{ marginTop: "-60px" }}>
        <Col xs="auto" className="text-center mb-4">
          <div style={{ position: "relative" }}>
            <Image
              src={
                formData.imageUrls && formData.imageUrls.length > 0
                  ? formData.imageUrls[0]
                  : "https://via.placeholder.com/150"
              }
              alt="User Profile"
              roundedCircle
              style={{
                width: "120px",
                height: "120px",
                objectFit: "cover",
                border: "4px solid white",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                cursor: "pointer",
              }}
              onClick={() => handleImageClick(0)}
            />
            <Button
              variant="primary"
              size="sm"
              style={{
                position: "absolute",
                bottom: "0",
                right: "0",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={handleOpenUploadModal}
            >
              <FaEdit />
            </Button>
          </div>
          <h4 className="mt-2 mb-0 fw-bold">{formData.name}</h4>
          <p className="text-muted small">
            @{formData.name.toLowerCase().replace(/\s+/g, "")}
          </p>
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

      {/* Stats Section */}
      <Row className="justify-content-center mb-4">
        <Col md={8} lg={6}>
          <Row className="g-3">
            <Col xs={6} sm={3}>
              <Link to={`/followersList`} className="text-decoration-none">
                <Card className="text-center h-100 border-0 shadow-sm hover-shadow">
                  <Card.Body className="d-flex flex-column align-items-center">
                    <div className="rounded-circle bg-light p-3 mb-2">
                      <FaUserFriends className="text-primary" size={24} />
                    </div>
                    <h5 className="fw-bold mb-0">
                      {followersDataMain?.count || 0}
                    </h5>
                    <p className="text-muted mb-0">Followers</p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>

            <Col xs={6} sm={3}>
              <Link to={`/followingsList`} className="text-decoration-none">
                <Card className="text-center h-100 border-0 shadow-sm hover-shadow">
                  <Card.Body className="d-flex flex-column align-items-center">
                    <div className="rounded-circle bg-light p-3 mb-2">
                      <FaUserCheck className="text-success" size={24} />
                    </div>
                    <h5 className="fw-bold mb-0">
                      {followingsDataMain?.count || 0}
                    </h5>
                    <p className="text-muted mb-0">Following</p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>

            <Col xs={6} sm={3}>
              <Link to={`/my-moments`} className="text-decoration-none">
                <Card className="text-center h-100 border-0 shadow-sm hover-shadow">
                  <Card.Body className="d-flex flex-column align-items-center">
                    <div className="rounded-circle bg-light p-3 mb-2">
                      <FaCameraRetro className="text-danger" size={24} />
                    </div>
                    <h5 className="fw-bold mb-0">{momentsData?.count || 0}</h5>
                    <p className="text-muted mb-0">Moments</p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>

            <Col xs={6} sm={3}>
              <Card className="text-center h-100 border-0 shadow-sm hover-shadow">
                <Card.Body className="d-flex flex-column align-items-center">
                  <div className="rounded-circle bg-light p-3 mb-2">
                    <FaEye className="text-info" size={24} />
                  </div>
                  <h5 className="fw-bold mb-0">320</h5>
                  <p className="text-muted mb-0">Visitors</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Profile Information */}
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          {/* Personal Information Card */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 fw-bold">Personal Information</h5>
              {editMode === "personal" ? (
                <div>
                  <Button
                    variant="success"
                    size="sm"
                    className="me-2"
                    onClick={handleSaveChanges}
                  >
                    <FaSave className="me-1" /> Save
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleCancelChanges}
                  >
                    <FaTimes className="me-1" /> Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setEditMode("personal")}
                >
                  <FaEdit className="me-1" /> Edit
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {editMode === "personal" ? (
                <Form>
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
                    <Form.Label>Birthday</Form.Label>
                    <DatePicker
                      selected={birthDate}
                      onChange={handleBirthDateChange}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Select Date"
                      className="form-control"
                      aria-label="Birthday date picker"
                    />
                  </Form.Group>
                </Form>
              ) : (
                <div className="py-2">
                  <Row className="mb-3">
                    <Col xs={4} className="text-muted">
                      Name:
                    </Col>
                    <Col xs={8} className="fw-medium">
                      {formData.name}
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col xs={4} className="text-muted">
                      Email:
                    </Col>
                    <Col xs={8} className="fw-medium">
                      {formData.email}
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col xs={4} className="text-muted">
                      Gender:
                    </Col>
                    <Col xs={8}>
                      {formData.gender ? (
                        <Badge
                          bg={formData.gender === "Male" ? "primary" : "danger"}
                          className="fw-normal"
                        >
                          {formData.gender}
                        </Badge>
                      ) : (
                        "Not specified"
                      )}
                    </Col>
                  </Row>
                  <Row>
                    <Col xs={4} className="text-muted">
                      Birthday:
                    </Col>
                    <Col xs={8}>
                      {formData.birth_day &&
                      formData.birth_month &&
                      formData.birth_year
                        ? `${getOrdinalSuffix(
                            formData.birth_day
                          )} of ${new Date(
                            Number(formData.birth_year),
                            Number(formData.birth_month) - 1
                          ).toLocaleString("en-US", { month: "long" })}, ${
                            formData.birth_year
                          }`
                        : "Not specified"}
                    </Col>
                  </Row>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Bio Section */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 fw-bold">Bio</h5>
              {editMode === "bio" ? (
                <div>
                  <Button
                    variant="success"
                    size="sm"
                    className="me-2"
                    onClick={handleSaveChanges}
                  >
                    <FaSave className="me-1" /> Save
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleCancelChanges}
                  >
                    <FaTimes className="me-1" /> Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setEditMode("bio")}
                >
                  <FaEdit className="me-1" /> Edit
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {editMode === "bio" ? (
                <Form.Group>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Write something about yourself"
                  />
                </Form.Group>
              ) : (
                <p className="mb-0">
                  {formData.bio ? (
                    formData.bio
                  ) : (
                    <span className="text-muted fst-italic">
                      No bio information provided
                    </span>
                  )}
                </p>
              )}
            </Card.Body>
          </Card>

          {/* Language Section */}
          <Card className="mb-4 border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 fw-bold">Languages</h5>
              {editMode === "languages" ? (
                <div>
                  <Button
                    variant="success"
                    size="sm"
                    className="me-2"
                    onClick={handleSaveChanges}
                  >
                    <FaSave className="me-1" /> Save
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleCancelChanges}
                  >
                    <FaTimes className="me-1" /> Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setEditMode("languages")}
                >
                  <FaEdit className="me-1" /> Edit
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {editMode === "languages" ? (
                <Form>
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
                  <Form.Group>
                    <Form.Label>Language to Learn</Form.Label>
                    <Form.Select
                      name="language_to_learn"
                      value={formData.language_to_learn}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Language to Learn</option>
                      {languageOptions.map((lang) => (
                        <option key={lang.value} value={lang.label}>
                          {lang.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Form>
              ) : (
                <div className="py-2">
                  <Row className="mb-3">
                    <Col xs={5} className="text-muted">
                      Native Language:
                    </Col>
                    <Col xs={7}>
                      {formData.native_language ? (
                        <Badge bg="primary" className="py-2 px-3 fw-normal">
                          {formData.native_language}
                        </Badge>
                      ) : (
                        <span className="text-muted fst-italic">
                          Not specified
                        </span>
                      )}
                    </Col>
                  </Row>
                  <Row>
                    <Col xs={5} className="text-muted">
                      Learning:
                    </Col>
                    <Col xs={7}>
                      {formData.language_to_learn ? (
                        <Badge bg="success" className="py-2 px-3 fw-normal">
                          {formData.language_to_learn}
                        </Badge>
                      ) : (
                        <span className="text-muted fst-italic">
                          Not specified
                        </span>
                      )}
                    </Col>
                  </Row>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfileScreen;
