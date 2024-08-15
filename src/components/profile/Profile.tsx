import React, { useEffect, useState } from "react";
import { useGetUserProfileQuery } from "../../store/slices/usersSlice";
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
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
import "./Profile.css";

interface UserProfileData {
  _id: string;
  name: string;
  gender: string;
  email: string;
  bio: string;
  birth_year: string;
  birth_month: string;
  birth_day: string;
  image: string;
  native_language: string;
  language_to_learn: string;
  createdAt: string;
  images: string[];
  imageUrls: string[];
}

const ProfileScreen: React.FC = () => {
  const { data, isLoading, error } = useGetUserProfileQuery({});
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

  const [editMode, setEditMode] = useState<
    "personal" | "bio" | "languages" | null
  >(null);

  useEffect(() => {
    if (data) {
      setFormData(data.data);
    }
  }, [data]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading user profile</div>;
  if (!data) return <div>No user profile data available</div>;

  const handleSaveChanges = () => {
    setEditMode(null);
    // Implement save logic, e.g., API call to update profile data
    console.log("Saved data:", formData);
  };

  const handleCancelChanges = () => {
    setEditMode(null);
    // Optionally, reset formData to original values if needed
  };

  return (
    <Container fluid className="profile-section">
      {/* Banner Section */}
      <Row className="justify-content-center my-3">
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
          />
          <Button variant="primary" className="profile-avatar-edit">
            <FaEdit /> Edit
          </Button>
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
