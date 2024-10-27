import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ISO6391 from "iso-639-1"; // No need to instantiate the class

import FormContainer from "../../composables/FormContainer";
import { Button, Col, Form, Image, InputGroup, Row } from "react-bootstrap";
import { FaEye, FaEyeSlash, FaPlus, FaTimes } from "react-icons/fa";
import {
  useRegisterUserMutation,
  useUploadUserPhotoMutation,
} from "../../store/slices/usersSlice";
import Loader from "../Loader";
import { toast } from "react-toastify";

export interface User {
  _id: string;
  name: string;
  gender: string;
  email: string;
  bio: string;
  birth_year: string;
  birth_month: string;
  birth_day: string;
  images: string[];
  followers: string[];
  following: string[];
  native_language: string;
  language_to_learn: string;
  createdAt: string;
}

export interface responseType {
  success: boolean;
  token: string;
  option: {
    expires: string;
    httpOnly: boolean;
  };
  user: User;
}

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [languageToLearn, setLanguageToLearn] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showPass, setShowPass] = useState(false);
  const [showPassTwo, setShowPassTwo] = useState(false);
  const [step, setStep] = useState(1); // State to track current step
  const navigate = useNavigate();
  const [registerUser, { isLoading }] = useRegisterUserMutation();

  const [uploadUserPhoto] = useUploadUserPhotoMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const redirect = sp.get("redirect") || "/";

  // First step handler (collecting name and email)
  const handleFirstStep = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStep(2); // Move to the second step
  };
  // Handle file selection for image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // const files = e.target.files;
    const files = Array.from(e.target.files || []);
    console.log(files);
    setSelectedImages((prevImages) => [...prevImages, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);
  };
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prevImages) => prevImages.filter((_, i) => i !== index));
    setImagePreviews((prevPreviews) =>
      prevPreviews.filter((_, i) => i !== index)
    );
  };
  const handleAddMoreImages = () => {
    fileInputRef.current?.click();
  };
  const submitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    const [year, month, day] = birthDate.split("-");
    // Prepare formData for submission
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("bio", bio);
    formData.append("gender", selectedGender);
    formData.append("native_language", nativeLanguage);
    formData.append("language_to_learn", languageToLearn);
    formData.append("birth_day", day);
    formData.append("birth_month", month);
    formData.append("birth_year", year);
    // // Append images
    // selectedImages.forEach((image) => {
    //   formData.append("images", image);
    // });

    try {
      // Send formData to your server using the registerUser mutation
      const response = await registerUser(formData).unwrap(); // Unwrap the response

      const user_id = response as responseType;

      // If images are selected, upload them

      if (selectedImages && selectedImages.length > 0) {
        const uploadFormData = new FormData();
        selectedImages.forEach((file) => {
          uploadFormData.append("file", file); // Correctly append each file
        });
        await uploadUserPhoto({
          userId: user_id.user._id, // Use `_id` from the response
          imageFiles: uploadFormData, // Pass FormData directly
        }).unwrap();

        toast.success("Registration successful!");
        navigate("/login"); // Redirect to another page
      }
    } catch (error) {
      toast.error("Error during registration");
    }
  };

  const clickHandler = () => {
    setShowPass((prev) => !prev);
  };

  const clickHandlerConfirm = () => {
    setShowPassTwo((prev) => !prev);
  };

  const languageOptions = ISO6391.getAllCodes().map((code) => ({
    value: code,
    label: ISO6391.getName(code),
  }));
  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);
  return (
    <FormContainer>
      {step === 1 ? (
        <Form onSubmit={handleFirstStep} className="p-4 m-4 shadow-lg rounded">
          <h1 className="text-center">Step 1: Basic Information</h1>
          <Form.Group controlId="name" className="my-4">
            <Form.Label className="p-1">
              Name <span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="email" className="my-4">
            <Form.Label>
              Email Address <span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="password" className="my-4">
            <Form.Label>
              Password <span style={{ color: "red" }}>*</span>
            </Form.Label>
            <InputGroup>
              <Form.Control
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <InputGroup.Text onClick={clickHandler}>
                {showPass ? <FaEyeSlash /> : <FaEye />}
              </InputGroup.Text>
            </InputGroup>
          </Form.Group>

          <Form.Group controlId="confirmPassword" className="my-4">
            <Form.Label>
              Confirm Password <span style={{ color: "red" }}>*</span>{" "}
            </Form.Label>
            <InputGroup>
              <Form.Control
                type={showPassTwo ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <InputGroup.Text onClick={clickHandlerConfirm}>
                {showPassTwo ? <FaEyeSlash /> : <FaEye />}
              </InputGroup.Text>
            </InputGroup>
          </Form.Group>

          <Button type="submit" variant="primary" className="w-100">
            Continue to Step 2
          </Button>

          <Row className="py-3">
            <Col>
              Already have an account?{" "}
              <Link to={redirect ? `/login?redirect=${redirect}` : `/login`}>
                Login
              </Link>
            </Col>
          </Row>
        </Form>
      ) : (
        <Form onSubmit={submitHandler} className="p-4 m-4 shadow-lg rounded">
          <h1 className="text-center">Step 2: Personal Information</h1>

          <Form.Group controlId="bio" className="my-4">
            <Form.Label>Bio(optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Tell us something about you"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="gender" className="my-4">
            <Form.Label>
              Gender <span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control
              as="select"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Form.Control>
          </Form.Group>

          <Form.Group controlId="nativeLanguage" className="my-4">
            <Form.Label>
              Native Language <span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control
              as="select"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              required
            >
              <option value="">Select Language</option>
              {languageOptions.map((lang) => (
                <option key={lang.value} value={lang.label}>
                  {lang.label}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Form.Group controlId="languageToLearn" className="my-4">
            <Form.Label>
              Language to Learn <span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control
              as="select"
              value={languageToLearn}
              onChange={(e) => setLanguageToLearn(e.target.value)}
              required
            >
              <option value="">Select Language</option>
              {languageOptions.map((lang) => (
                <option key={lang.value} value={lang.label}>
                  {lang.label}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Form.Group controlId="birthDate" className="my-4">
            <Form.Label>
              Birth Date <span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="imageUpload" className="my-4">
            <Form.Label>
              Profile Images <span style={{ color: "red" }}>*</span>
            </Form.Label>

            {/* <Form.Control
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
            /> */}
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
                        height: "40px",
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
            {/* {selectedImages.length > 0 && (
              <div
                className="image-preview"
                style={{ display: "flex", flexWrap: "wrap", marginTop: "10px" }}
              >
                {selectedImages.map((image, index) => (
                  <img
                    key={index}
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index}`}
                    style={{
                      width: 100,
                      height: 100,
                      margin: "5px",
                      borderRadius: "5px",
                      objectFit: "cover",
                      border: "1px solid #ddd",
                    }}
                  />
                ))}
              </div> */}
            {/* )} */}
          </Form.Group>

          <Row>
            <Col>
              <Button
                type="button"
                variant="secondary"
                className="w-100 mb-3"
                onClick={() => setStep(1)} // Go back to step 1
              >
                Previous
              </Button>
            </Col>
            <Col>
              <Button
                disabled={isLoading}
                type="submit"
                variant="success"
                className="w-100"
              >
                {isLoading ? "Registering..." : "Register"}
              </Button>
            </Col>
          </Row>

          {isLoading && <Loader />}

          <Row className="py-3">
            <Col>
              Already have an account?{" "}
              <Link to={redirect ? `/login?redirect=${redirect}` : `/login`}>
                Login
              </Link>
            </Col>
          </Row>
        </Form>
      )}
    </FormContainer>
  );
};

export default Register;
