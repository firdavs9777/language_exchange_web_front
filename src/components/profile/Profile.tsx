import React, { useEffect, useState, useCallback } from "react";
import {
  useGetFollowersQuery,
  useGetFollowingsQuery,
  useGetUserProfileQuery,
  useUploadMultipleUserPhotosMutation,
  useUpdateUserInfoMutation,
  useDeleteUserPhotoMutation,
} from "../../store/slices/usersSlice";
import {
  Button,
  Card,
  Col,
  Container,
  Row,
  Form,
  Badge,
  Spinner,
  Alert,
} from "react-bootstrap";
import {
  FaCameraRetro,
  FaEdit,
  FaEye,
  FaSave,
  FaTimes,
  FaUserCheck,
  FaUserFriends,
  FaGlobeAmericas,
  FaHeart,
  FaComments,
  FaCamera,
  FaBookOpen,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useGetMyMomentsQuery } from "../../store/slices/momentsSlice";
import { useGetMyStoriesQuery } from "../../store/slices/storiesSlice";
import { MomentType } from "../moments/types";
import { FollowerInterface, UserProfileData } from "./ProfileTypes/types";
import ImageViewerModal from "./ImageViewer/ImageModal";
import ImageUploaderModal from "./ImageUploader/ImageUploader";
import { Bounce, toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ISO6391 from "iso-639-1";
import { useTranslation } from "react-i18next";
import LanguagesView from "./LanguageView";
import { setCredentials } from "../../store/slices/authSlice";
import { useDispatch } from "react-redux";
import "./Profile.scss";

interface Moment {
  count: number;
  success: string;
  data: MomentType[];
}

const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const userId = useSelector((state: any) => state.auth.userInfo?.user?._id);

  useEffect(() => {
    window.scrollTo(0, 1);
  }, [userId]);

  // API Queries
  const { data, isLoading, error, refetch } = useGetUserProfileQuery({}) as {
    data: { data?: any; success?: boolean } | undefined;
    isLoading: boolean;
    error: any;
    refetch: () => void;
  };
  const { data: followers } = useGetFollowersQuery({ userId });
  const { data: followings } = useGetFollowingsQuery({ userId });
  const { data: moments } = useGetMyMomentsQuery({ userId });
  const { data: myStories } = useGetMyStoriesQuery({});
  const [uploadMultipleUserPhotos] = useUploadMultipleUserPhotosMutation();
  const [updateUserProfile] = useUpdateUserInfoMutation();
  const [deleteUserPhoto] = useDeleteUserPhotoMutation();
  const dispatch = useDispatch();

  // State
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
  const [showModal, setShowModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Derived data
  const followersData = followers as FollowerInterface;
  const followingsData = followings as FollowerInterface;
  const momentsData = moments as Moment;
  const storiesData = myStories as { data?: any[]; count?: number } | undefined;
  const storiesCount = Array.isArray(storiesData) 
    ? storiesData.length 
    : storiesData?.count || storiesData?.data?.length || 0;

  // Memoized language options
  const languageOptions = React.useMemo(() => {
    return ISO6391.getAllCodes().map((code) => ({
      value: code,
      label: ISO6391.getName(code),
    }));
  }, []);

  // Initialize form data
  useEffect(() => {
    if (data?.data) {
      const userData = {
        ...data.data,
        imageUrls:
          data.data.imageUrls &&
          Array.isArray(data.data.imageUrls) &&
          data.data.imageUrls.length > 0
            ? data.data.imageUrls
            : data.data.images &&
              Array.isArray(data.data.images) &&
              data.data.images.length > 0
            ? data.data.images.map((img: string) =>
                img && (img.startsWith("http://") || img.startsWith("https://"))
                  ? img
                  : `https://api.banatalk.com/uploads/${img}`
              )
            : [],
      };

      setFormData(userData);

      if (
        data.data.birth_year &&
        data.data.birth_month &&
        data.data.birth_day
      ) {
        const year = parseInt(data.data.birth_year);
        const month = parseInt(data.data.birth_month) - 1;
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
          setBirthDate(null);
        }
      } else {
        setBirthDate(null);
      }
    }
  }, [data]);

  // Handlers
  const handleUploadImages = useCallback(
    async (newFiles: File[]) => {
      try {
        if (newFiles.length > 0 && userId) {
          const formData = new FormData();
          newFiles.forEach((file) => formData.append("photos", file));

          const userInfo = await uploadMultipleUserPhotos({
            userId,
            imageFiles: formData,
          }).unwrap();
          const ActionPayload: Response | any = userInfo;
          dispatch(setCredentials({ ...ActionPayload }));
          refetch();
          toast.success(t("profile.messages.image_update_success"));
        }
      } catch (error: any) {
        toast.error(
          `${t("profile.messages.image_update_failure")}: ${
            error?.error || t("profile.messages.unknown_error")
          }`,
          {
            autoClose: 3000,
            hideProgressBar: false,
            theme: "dark",
            transition: Bounce,
          }
        );
      }
    },
    [uploadMultipleUserPhotos, userId, refetch, t, dispatch]
  );

  const handleProfileUpdate = useCallback(async () => {
    try {
      const updatePayload = {
        ...formData,
        gender: formData.gender
          ? formData.gender.toLowerCase()
          : formData.gender,
      };

      const userInfo = await updateUserProfile(updatePayload).unwrap();

      const ActionPayload: Response | any = userInfo;
      dispatch(setCredentials({ ...ActionPayload }));
      toast.success(t("profile.messages.profile_update_success"), {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
      setEditMode(null);
      refetch();
    } catch (error: any) {
      toast.error(
        `${t("profile.messages.profile_update_failure")}: ${
          error?.error || t("profile.messages.unknown_error")
        }`,
        {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        }
      );
    }
  }, [formData, updateUserProfile, refetch, t, dispatch]);

  const handleBirthDateChange = useCallback((date: Date | null) => {
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
  }, []);

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleCancelChanges = useCallback(() => {
    setEditMode(null);
    if (data?.data) {
      setFormData(data.data);
      if (
        data.data.birth_year &&
        data.data.birth_month &&
        data.data.birth_day
      ) {
        const year = parseInt(data.data.birth_year);
        const month = parseInt(data.data.birth_month) - 1;
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
          setBirthDate(null);
        }
      } else {
        setBirthDate(null);
      }
    }
  }, [data]);

  const handleDeletePhoto = useCallback(
    async (index: number) => {
      if (!userId) return;

      const currentImages =
        formData.imageUrls && formData.imageUrls.length > 0
          ? formData.imageUrls
          : formData.images && formData.images.length > 0
          ? formData.images
          : [];

      if (currentImages.length <= 1) {
        toast.warning(
          t("profile.messages.cannot_delete_last_image") ||
            "You must keep at least one profile picture",
          {
            autoClose: 3000,
            hideProgressBar: false,
            theme: "dark",
            transition: Bounce,
          }
        );
        return;
      }

      try {
        const userInfo = await deleteUserPhoto({ userId, index }).unwrap();
        const ActionPayload: Response | any = userInfo;
        dispatch(setCredentials({ ...ActionPayload }));
        toast.success(t("profile.messages.image_delete_success"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
        refetch();
      } catch (error: any) {
        toast.error(
          `${t("profile.messages.image_delete_failure")}: ${
            error?.error || t("profile.messages.unknown_error")
          }`
        );
      }
    },
    [deleteUserPhoto, userId, refetch, t, formData, dispatch]
  );

  const handleImageClick = useCallback((index: number) => {
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  }, []);

  const getOrdinalSuffix = useCallback((day: string): string => {
    const n = parseInt(day);
    if (isNaN(n)) return day;

    if (n >= 11 && n <= 13) return `${n}th`;

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
  }, []);

  const getProfileImageUrl = useCallback(
    (index: number = 0): string => {
      if (Array.isArray(formData.imageUrls) && formData.imageUrls[index]) {
        const url = formData.imageUrls[index];
        if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
          return url;
        }
      }

      if (Array.isArray(formData.images) && formData.images[index]) {
        const image = formData.images[index];
        if (image) {
          if (image.startsWith("http://") || image.startsWith("https://")) {
            return image;
          }
          return `https://api.banatalk.com/uploads/${image}`;
        }
      }

      return "https://via.placeholder.com/150";
    },
    [formData]
  );

  const allImages =
    Array.isArray(formData.imageUrls) && formData.imageUrls.length > 0
      ? formData.imageUrls
      : Array.isArray(formData.images) && formData.images.length > 0
      ? formData.images.map((img) =>
          img.startsWith("http://") || img.startsWith("https://")
            ? img
            : `https://api.banatalk.com/uploads/${img}`
        )
      : [];

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-3">
        {t("profile.messages.error_loading_profile")}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert variant="warning" className="m-3">
        {t("profile.messages.no_profile_data")}
      </Alert>
    );
  }

  return (
    <div className="profile-page">
      {/* Hero Section with Cover Image */}
      <div className="profile-hero">
        <div className="profile-hero-overlay"></div>
        <Container>
          <div className="profile-hero-content">
            {/* Profile Avatar & Basic Info */}
            <div className="profile-header-card">
              <div className="profile-avatar-wrapper">
                <div
                  className="profile-avatar"
                  onClick={() => handleImageClick(0)}
                >
                  <img
                    src={getProfileImageUrl(0)}
                    alt={formData.name}
                    onError={(e: any) => {
                      e.target.src = "https://via.placeholder.com/150";
                    }}
                  />
                  <div className="avatar-overlay">
                    <FaCamera />
                  </div>
                </div>
                <button
                  className="avatar-edit-btn"
                  onClick={() => setShowModal(true)}
                  aria-label={t("profile.actions.edit_photo")}
                >
                  <FaEdit />
                </button>
              </div>

              <div className="profile-info">
                <h1 className="profile-name">{formData.name || "User"}</h1>
                <p className="profile-username">
                  @
                  {formData.name
                    ? formData.name.toLowerCase().replace(/\s+/g, "")
                    : "username"}
                </p>

                {/* Language Badges */}
                <div className="language-badges">
                  {formData.native_language && (
                    <Badge bg="primary" className="language-badge">
                      <FaGlobeAmericas className="me-1" />
                      {formData.native_language}
                    </Badge>
                  )}
                  {formData.language_to_learn && (
                    <Badge bg="success" className="language-badge">
                      <FaHeart className="me-1" />
                      Learning {formData.language_to_learn}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <Row className="profile-stats-grid g-3">
              <Col xs={6} md={3}>
                <Link to="/followersList" className="stat-card">
                  <div className="stat-icon followers-icon">
                    <FaUserFriends />
                  </div>
                  <div className="stat-value">{followersData?.count || 0}</div>
                  <div className="stat-label">
                    {t("profile.stats.followers")}
                  </div>
                </Link>
              </Col>

              <Col xs={6} md={3}>
                <Link to="/followingsList" className="stat-card">
                  <div className="stat-icon following-icon">
                    <FaUserCheck />
                  </div>
                  <div className="stat-value">{followingsData?.count || 0}</div>
                  <div className="stat-label">
                    {t("profile.stats.following")}
                  </div>
                </Link>
              </Col>

              <Col xs={6} md={3}>
                <Link to="/my-moments" className="stat-card">
                  <div className="stat-icon moments-icon">
                    <FaCameraRetro />
                  </div>
                  <div className="stat-value">{momentsData?.count || 0}</div>
                  <div className="stat-label">{t("profile.stats.moments")}</div>
                </Link>
              </Col>

              <Col xs={6} md={3}>
                <Link to="/my-stories" className="stat-card">
                  <div className="stat-icon stories-icon">
                    <FaBookOpen />
                  </div>
                  <div className="stat-value">{storiesCount}</div>
                  <div className="stat-label">{t("profile.stats.stories") || "Stories"}</div>
                </Link>
              </Col>
            </Row>

            <Row className="profile-stats-grid g-3 mt-0">
              <Col xs={12} md={6}>
                {data?.data?.profileStats?.totalVisits > 0 ? (
                  <Link to="/visitorsList" className="stat-card">
                    <div className="stat-icon visitors-icon">
                      <FaEye />
                    </div>
                    <div className="stat-value">
                      {data?.data?.profileStats?.totalVisits || 0}
                    </div>
                    <div className="stat-label">
                      {t("profile.stats.visitors")}
                    </div>
                  </Link>
                ) : (
                  <div className="stat-card">
                    <div className="stat-icon visitors-icon">
                      <FaEye />
                    </div>
                    <div className="stat-value">
                      {data?.data?.profileStats?.totalVisits || 0}
                    </div>
                    <div className="stat-label">
                      {t("profile.stats.visitors")}
                    </div>
                  </div>
                )}
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      {/* Main Content */}
      <Container className="profile-content">
        {/* Photo Gallery */}
        {allImages.length > 1 && (
          <Card className="section-card photo-gallery-card">
            <Card.Body>
              <h5 className="section-title">
                <FaCamera className="me-2" />
                {t("profile.sections.photos") || "Photos"}
              </h5>
              <Row className="g-2">
                {allImages.map((image, index) => (
                  <Col xs={4} md={3} key={index}>
                    <div
                      className="gallery-image"
                      onClick={() => handleImageClick(index)}
                    >
                      <img
                        src={image}
                        alt={`${formData.name || "User"}'s ${index + 1}`}
                        onError={(e: any) => {
                          e.target.src = "https://via.placeholder.com/150";
                        }}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Bio Section */}
        <ProfileSection
          title={t("profile.sections.bio")}
          icon={<FaComments />}
          editMode={editMode === "bio"}
          onEdit={() => setEditMode("bio")}
          onSave={handleProfileUpdate}
          onCancel={handleCancelChanges}
        >
          {editMode === "bio" ? (
            <Form.Control
              as="textarea"
              rows={4}
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder={t("profile.placeholders.bio")}
              className="modern-textarea"
            />
          ) : (
            <p className="bio-text">
              {formData.bio || (
                <span className="text-muted fst-italic">
                  {t("profile.messages.no_bio")}
                </span>
              )}
            </p>
          )}
        </ProfileSection>

        {/* Personal Information */}
        <ProfileSection
          title={t("profile.sections.personal_info")}
          icon={<FaUserCheck />}
          editMode={editMode === "personal"}
          onEdit={() => setEditMode("personal")}
          onSave={handleProfileUpdate}
          onCancel={handleCancelChanges}
        >
          {editMode === "personal" ? (
            <PersonalInfoForm
              formData={formData}
              onInputChange={handleInputChange}
              birthDate={birthDate}
              onDateChange={handleBirthDateChange}
            />
          ) : (
            <PersonalInfoView
              formData={formData}
              getOrdinalSuffix={getOrdinalSuffix}
            />
          )}
        </ProfileSection>

        {/* Languages Section */}
        <ProfileSection
          title={t("profile.sections.languages")}
          icon={<FaGlobeAmericas />}
          editMode={editMode === "languages"}
          onEdit={() => setEditMode("languages")}
          onSave={handleProfileUpdate}
          onCancel={handleCancelChanges}
        >
          {editMode === "languages" ? (
            <LanguagesForm
              formData={formData}
              onInputChange={handleInputChange}
              languageOptions={languageOptions}
            />
          ) : (
            <LanguagesView formData={formData} />
          )}
        </ProfileSection>
      </Container>

      {/* Modals */}
      <ImageViewerModal
        show={showImageViewer}
        images={allImages}
        currentIndex={currentImageIndex}
        onClose={() => setShowImageViewer(false)}
        onSelectImage={setCurrentImageIndex}
      />

      <ImageUploaderModal
        onDeleteImage={handleDeletePhoto}
        images={allImages}
        show={showModal}
        onClose={() => setShowModal(false)}
        onUploadImages={handleUploadImages}
      />
    </div>
  );
};

// Sub-components
const ProfileSection: React.FC<{
  title: string;
  icon?: React.ReactNode;
  editMode: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}> = ({ title, icon, editMode, onEdit, onSave, onCancel, children }) => {
  const { t } = useTranslation();

  return (
    <Card className="section-card">
      <Card.Body>
        <div className="section-header">
          <h5 className="section-title">
            {icon && <span className="section-icon">{icon}</span>}
            {title}
          </h5>
          {editMode ? (
            <div className="button-group">
              <Button
                variant="success"
                size="sm"
                className="action-btn save-btn"
                onClick={onSave}
              >
                <FaSave className="me-1" /> {t("profile.actions.save")}
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="action-btn cancel-btn"
                onClick={onCancel}
              >
                <FaTimes className="me-1" /> {t("profile.actions.cancel")}
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="action-btn edit-btn"
              onClick={onEdit}
            >
              <FaEdit className="me-1" /> {t("profile.actions.edit")}
            </Button>
          )}
        </div>
        <div className="section-content">{children}</div>
      </Card.Body>
    </Card>
  );
};

const PersonalInfoForm: React.FC<{
  formData: UserProfileData;
  onInputChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >;
  birthDate: Date | null;
  onDateChange: (date: Date | null) => void;
}> = ({ formData, onInputChange, birthDate, onDateChange }) => {
  const { t } = useTranslation();

  return (
    <Form>
      <Form.Group className="mb-3">
        <Form.Label className="modern-label">
          {t("profile.labels.name")}
        </Form.Label>
        <Form.Control
          type="text"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          className="modern-input"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label className="modern-label">
          {t("profile.labels.email")}
        </Form.Label>
        <Form.Control
          type="email"
          name="email"
          value={formData.email}
          disabled
          onChange={onInputChange}
          className="modern-input"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label className="modern-label">
          {t("profile.labels.gender")}
        </Form.Label>
        <Form.Select
          name="gender"
          value={formData.gender}
          onChange={onInputChange}
          className="modern-select"
        >
          <option value="">{t("profile.placeholders.select_gender")}</option>
          <option value="male">{t("profile.options.male")}</option>
          <option value="female">{t("profile.options.female")}</option>
          <option value="other">{t("profile.options.other") || "Other"}</option>
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label className="modern-label">
          {t("profile.labels.birthday")}
        </Form.Label>
        <DatePicker
          selected={birthDate}
          onChange={onDateChange}
          dateFormat="dd/MM/yyyy"
          placeholderText={t("profile.placeholders.select_date")}
          className="form-control modern-input"
          aria-label={t("profile.labels.birthday")}
        />
      </Form.Group>
    </Form>
  );
};

const PersonalInfoView: React.FC<{
  formData: UserProfileData;
  getOrdinalSuffix: (day: string) => string;
}> = ({ formData, getOrdinalSuffix }) => {
  const { t } = useTranslation();

  return (
    <div className="info-grid">
      <div className="info-item">
        <div className="info-label">{t("profile.labels.name")}</div>
        <div className="info-value">{formData.name}</div>
      </div>
      <div className="info-item">
        <div className="info-label">{t("profile.labels.email")}</div>
        <div className="info-value">{formData.email}</div>
      </div>
      <div className="info-item">
        <div className="info-label">{t("profile.labels.gender")}</div>
        <div className="info-value">
          {formData.gender ? (
            <Badge
              bg={
                formData.gender.toLowerCase() === "male"
                  ? "primary"
                  : formData.gender.toLowerCase() === "female"
                  ? "danger"
                  : "secondary"
              }
              className="gender-badge"
            >
              {formData.gender}
            </Badge>
          ) : (
            t("profile.messages.not_specified")
          )}
        </div>
      </div>
      <div className="info-item">
        <div className="info-label">{t("profile.labels.birthday")}</div>
        <div className="info-value">
          {formData.birth_day && formData.birth_month && formData.birth_year
            ? `${getOrdinalSuffix(formData.birth_day)} ${t(
                "profile.labels.of"
              )} ${new Date(
                Number(formData.birth_year),
                Number(formData.birth_month) - 1
              ).toLocaleString("en-US", { month: "long" })}, ${
                formData.birth_year
              }`
            : t("profile.messages.not_specified")}
        </div>
      </div>
    </div>
  );
};

const LanguagesForm: React.FC<{
  formData: UserProfileData;
  onInputChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >;
  languageOptions: { value: string; label: string }[];
}> = ({ formData, onInputChange, languageOptions }) => {
  const { t } = useTranslation();

  return (
    <Form>
      <Form.Group className="mb-3">
        <Form.Label className="modern-label">
          {t("profile.labels.native_language")}
        </Form.Label>
        <Form.Select
          name="native_language"
          value={formData.native_language}
          onChange={onInputChange}
          required
          className="modern-select"
        >
          <option value="">
            {t("profile.placeholders.select_native_language")}
          </option>
          {languageOptions.map((lang) => (
            <option key={lang.value} value={lang.label}>
              {lang.label}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group>
        <Form.Label className="modern-label">
          {t("profile.labels.learning")}
        </Form.Label>
        <Form.Select
          name="language_to_learn"
          value={formData.language_to_learn}
          onChange={onInputChange}
          required
          className="modern-select"
        >
          <option value="">
            {t("profile.placeholders.select_learning_language")}
          </option>
          {languageOptions.map((lang) => (
            <option key={lang.value} value={lang.label}>
              {lang.label}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    </Form>
  );
};

export default ProfileScreen;
