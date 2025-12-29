import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ISO6391 from "iso-639-1";

import {
  Button,
  Col,
  Form,
  Image,
  InputGroup,
  Row,
  Container,
} from "react-bootstrap";
import {
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaTimes,
  FaArrowLeft,
  FaArrowRight,
  FaUserPlus,
  FaCheckCircle,
} from "react-icons/fa";
import {
  useRegisterUserMutation,
  useUploadMultipleUserPhotosMutation,
  useVerifyCodeEmailMutation,
  useRegisterCodeEmailMutation,
  useUpdateUserInfoMutation,
} from "../../store/slices/usersSlice";
import Loader from "../Loader";
import { Bounce, toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import "./Register.scss";

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

interface VerifyCodeResponse {
  success: boolean;
  statusCode: number;
  message: string;
}

const Register = () => {
  const { search, state } = useLocation();
  const sp = new URLSearchParams(search);
  const redirect = sp.get("redirect") || "/";
  
  // Check if coming from OAuth callback
  const isOAuthUser = state?.oauth === true;
  const initialStep = state?.step || 1;
  const oauthUserData = state?.userData || {};

  const [email, setEmail] = useState(oauthUserData.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState(oauthUserData.name || "");
  const [bio, setBio] = useState(oauthUserData.bio || "");
  // Normalize gender to lowercase if coming from OAuth
  const initialGender = oauthUserData.gender 
    ? oauthUserData.gender.toLowerCase() 
    : "";
  const [selectedGender, setSelectedGender] = useState(initialGender);
  const [nativeLanguage, setNativeLanguage] = useState(oauthUserData.nativeLanguage || "");
  const [languageToLearn, setLanguageToLearn] = useState(oauthUserData.languageToLearn || "");
  const [birthDate, setBirthDate] = useState(oauthUserData.birthDate || "");
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showPass, setShowPass] = useState(false);
  const [showPassTwo, setShowPassTwo] = useState(false);
  const [step, setStep] = useState(initialStep);
  const [isCodeVerified, setIsCodeVerified] = useState(isOAuthUser ? true : false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [registerUser, { isLoading: isRegistering }] =
    useRegisterUserMutation();
  const [uploadMultipleUserPhotos, { isLoading: isUploadingMultiple }] =
    useUploadMultipleUserPhotosMutation();
  const [sendCodeEmail, { isLoading: isSendingCode }] =
    useRegisterCodeEmailMutation();
  const [verifyCode, { isLoading: isVerifying }] = useVerifyCodeEmailMutation();
  const [updateUserInfo, { isLoading: isUpdating }] = useUpdateUserInfoMutation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get user ID from Redux state for OAuth users
  const userId = useSelector((state: any) => 
    state.auth.userInfo?.data?._id || 
    state.auth.userInfo?.user?._id ||
    state.auth.userInfo?._id
  );

  const handleFirstStep = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("authentication.toasts.passwordMismatch"), {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
      return;
    }
    setStep(2);
  };

  interface SendCodeEmailResponse {
    success: boolean;
    message: string;
    expiresIn?: string;
  }

  const handleSecondStep = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // OAuth users skip email verification
    if (isOAuthUser) {
      handleOAuthProfileCompletion();
    } else {
      handleSendVerificationCode();
    }
  };

  const handleOAuthProfileCompletion = async () => {
    if (!birthDate) {
      toast.error("Please select your birth date", {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
      return;
    }

    if (!userId) {
      toast.error("User not authenticated", {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
      return;
    }

    const [year, month, day] = birthDate.split("-");

    try {
      // Update user profile for OAuth users
      // Gender should already be lowercase from form, but ensure it is
      const genderValue = selectedGender.toLowerCase();
      
      const updateData = {
        name: name,
        bio: bio.trim(),
        gender: genderValue,
        native_language: nativeLanguage,
        language_to_learn: languageToLearn,
        birth_day: day,
        birth_month: month,
        birth_year: year,
        profileCompleted: true,
      };

      await updateUserInfo(updateData).unwrap();

      // Upload images if any - use multiple photos endpoint
      if (selectedImages && selectedImages.length > 0) {
        const uploadFormData = new FormData();
        // Use 'photos' field name (plural) to match backend expectation
        selectedImages.forEach((file) => {
          uploadFormData.append("photos", file);
        });
        await uploadMultipleUserPhotos({
          userId: userId,
          imageFiles: uploadFormData,
        }).unwrap();
      }

      toast.success("Profile completed! Welcome to BananaTalk! 🎉", {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });

      // Redirect to home
      navigate("/");
    } catch (error: any) {
      toast.error(
        error?.data?.error || error?.data?.message || "Failed to update profile",
        {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        }
      );
    }
  };

  const handleSendVerificationCode = async (): Promise<void> => {
    try {
      const response = (await sendCodeEmail({
        email,
      }).unwrap()) as SendCodeEmailResponse;

      if (response.success) {
        toast.success(t("authentication.toasts.verificationSent"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
        setStep(3);
      }
    } catch (error: any) {
      toast.error(
        error?.data?.message || t("authentication.toasts.sendCodeFailed"),
        {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        }
      );
    }
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const verificationResponse = (await verifyCode({
        email,
        code: verificationCode,
      }).unwrap()) as VerifyCodeResponse;

      if (verificationResponse.success) {
        setIsCodeVerified(true);
        toast.success(t("authentication.toasts.emailVerified"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
      }
    } catch (error: any) {
      toast.error(
        `${error?.data?.error || t("authentication.toasts.invalidCode")}`,
        {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        }
      );
    }
  };

  const handleFinalRegistration = async () => {
    if (!isCodeVerified) {
      toast.error(t("authentication.toasts.verifyFirst"), {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
      return;
    }

    const [year, month, day] = birthDate.split("-");

    // Convert gender to lowercase to match backend validation
    const genderValue = selectedGender.toLowerCase();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("bio", bio);
    formData.append("gender", genderValue);
    formData.append("native_language", nativeLanguage);
    formData.append("language_to_learn", languageToLearn);
    formData.append("birth_day", day);
    formData.append("birth_month", month);
    formData.append("birth_year", year);

    try {
      const response = await registerUser(formData).unwrap();
      const user_id = response as responseType;

      if (selectedImages && selectedImages.length > 0) {
        const uploadFormData = new FormData();
        // Use 'photos' field name (plural) to match backend expectation
        selectedImages.forEach((file) => {
          uploadFormData.append("photos", file);
        });
        await uploadMultipleUserPhotos({
          userId: user_id.user._id,
          imageFiles: uploadFormData,
        }).unwrap();
      }

      toast.success(t("authentication.toasts.registrationSuccess"), {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
      navigate("/login");
    } catch (error: any) {
      toast.error(
        `${error?.data?.error || t("authentication.toasts.registrationError")}`,
        {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        }
      );
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
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

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  const calculateProgress = () => {
    if (isOAuthUser) {
      // OAuth users only have profile step
      return 100;
    }
    if (step === 1) return 33;
    if (step === 2) return 66;
    return 100;
  };

  return (
    <div className="register-page">
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={8} xl={7}>
            <div className="register-form">
              {/* Progress Bar */}
              <div className="progress-section">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
                <div className="step-indicators">
                  {!isOAuthUser && (
                    <>
                      <div className={`step-indicator ${step >= 1 ? "active" : ""}`}>
                        <div className="step-number">{step > 1 ? "✓" : "1"}</div>
                        <span>{t("authentication.progressBar.account")}</span>
                      </div>
                      <div className={`step-indicator ${step >= 2 ? "active" : ""}`}>
                        <div className="step-number">{step > 2 ? "✓" : "2"}</div>
                        <span>{t("authentication.progressBar.profile")}</span>
                      </div>
                      <div className={`step-indicator ${step >= 3 ? "active" : ""}`}>
                        <div className="step-number">3</div>
                        <span>{t("authentication.progressBar.verify")}</span>
                      </div>
                    </>
                  )}
                  {isOAuthUser && (
                    <div className="step-indicator active">
                      <div className="step-number">✓</div>
                      <span>Complete Profile</span>
                    </div>
                  )}
                </div>
              </div>

              {step === 1 && !isOAuthUser ? (
                <Form onSubmit={handleFirstStep} className="register-step-form">
                  <h2 className="step-title">
                    {t("authentication.account.title")}
                  </h2>

                  <Form.Group controlId="name" className="form-group">
                    <Form.Label className="form-label">
                      {t("authentication.account.name")}{" "}
                      <span className="required">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder={t("authentication.account.name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="form-control-custom"
                    />
                  </Form.Group>

                  <Form.Group controlId="email" className="form-group">
                    <Form.Label className="form-label">
                      {t("authentication.account.email")}{" "}
                      <span className="required">*</span>
                    </Form.Label>
                    <Form.Control
                      type="email"
                      placeholder={t("authentication.account.email")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="form-control-custom"
                    />
                  </Form.Group>

                  <Form.Group controlId="password" className="form-group">
                    <Form.Label className="form-label">
                      {t("authentication.account.password")}{" "}
                      <span className="required">*</span>
                    </Form.Label>
                    <InputGroup className="password-input-group">
                      <Form.Control
                        type={showPass ? "text" : "password"}
                        placeholder={t("authentication.account.password")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="form-control-custom"
                      />
                      <InputGroup.Text
                        onClick={clickHandler}
                        className="password-toggle"
                      >
                        {showPass ? <FaEyeSlash /> : <FaEye />}
                      </InputGroup.Text>
                    </InputGroup>
                    <Form.Text className="form-text">
                      {t("authentication.account.passwordRequirement")}
                    </Form.Text>
                  </Form.Group>

                  <Form.Group controlId="confirmPassword" className="form-group">
                    <Form.Label className="form-label">
                      {t("authentication.account.confirmPassword")}{" "}
                      <span className="required">*</span>
                    </Form.Label>
                    <InputGroup className="password-input-group">
                      <Form.Control
                        type={showPassTwo ? "text" : "password"}
                        placeholder={t("authentication.account.confirmPassword")}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="form-control-custom"
                      />
                      <InputGroup.Text
                        onClick={clickHandlerConfirm}
                        className="password-toggle"
                      >
                        {showPassTwo ? <FaEyeSlash /> : <FaEye />}
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>

                  <Button type="submit" className="submit-btn">
                    {t("authentication.account.continue")}{" "}
                    <FaArrowRight className="ms-2" />
                  </Button>

                  <div className="login-link-section">
                    {t("authentication.account.alreadyHaveAccount")}{" "}
                    <Link
                      to={redirect ? `/login?redirect=${redirect}` : `/login`}
                      className="login-link"
                    >
                      {t("authentication.account.login")}
                    </Link>
                  </div>
                </Form>
              ) : (step === 2 || (step === 1 && isOAuthUser)) ? (
                <Form onSubmit={handleSecondStep} className="register-step-form">
                  <h2 className="step-title">
                    {isOAuthUser ? "Complete Your Profile" : t("authentication.profile.title")}
                  </h2>
                  {isOAuthUser && (
                    <p className="text-center text-muted mb-4">
                      Welcome! Please complete your profile to continue.
                    </p>
                  )}

                  <Form.Group controlId="bio" className="form-group">
                    <Form.Label className="form-label">
                      {t("authentication.profile.bio")}
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder={t("authentication.profile.bioPlaceholder")}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="form-control-custom"
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group controlId="gender" className="form-group">
                        <Form.Label className="form-label">
                          {t("authentication.profile.gender")}{" "}
                          <span className="required">*</span>
                        </Form.Label>
                        <Form.Select
                          value={selectedGender}
                          onChange={(e) => setSelectedGender(e.target.value)}
                          required
                          className="form-control-custom"
                        >
                          <option value="">
                            {t("authentication.profile.genderOptions.select")}
                          </option>
                          <option value="male">
                            {t("authentication.profile.genderOptions.male")}
                          </option>
                          <option value="female">
                            {t("authentication.profile.genderOptions.female")}
                          </option>
                          <option value="other">
                            {t("authentication.profile.genderOptions.other")}
                          </option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="birthDate" className="form-group">
                        <Form.Label className="form-label">
                          {t("authentication.profile.birthDate")}{" "}
                          <span className="required">*</span>
                        </Form.Label>
                        <Form.Control
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          required
                          className="form-control-custom"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group
                        controlId="nativeLanguage"
                        className="form-group"
                      >
                        <Form.Label className="form-label">
                          {t("authentication.profile.nativeLanguage")}{" "}
                          <span className="required">*</span>
                        </Form.Label>
                        <Form.Select
                          value={nativeLanguage}
                          onChange={(e) => setNativeLanguage(e.target.value)}
                          required
                          className="form-control-custom"
                        >
                          <option value="">
                            {t("authentication.profile.selectLanguage")}
                          </option>
                          {languageOptions.map((lang) => (
                            <option key={lang.value} value={lang.label}>
                              {lang.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group
                        controlId="languageToLearn"
                        className="form-group"
                      >
                        <Form.Label className="form-label">
                          {t("authentication.profile.languageToLearn")}{" "}
                          <span className="required">*</span>
                        </Form.Label>
                        <Form.Select
                          value={languageToLearn}
                          onChange={(e) => setLanguageToLearn(e.target.value)}
                          required
                          className="form-control-custom"
                        >
                          <option value="">
                            {t("authentication.profile.selectLanguage")}
                          </option>
                          {languageOptions.map((lang) => (
                            <option key={lang.value} value={lang.label}>
                              {lang.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group controlId="imageUpload" className="form-group">
                    <Form.Label className="form-label">
                      {t("authentication.profile.profileImages")}{" "}
                      <span className="required">*</span>
                    </Form.Label>

                    {imagePreviews.length > 0 ? (
                      <div className="image-preview-grid">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="image-preview-item">
                            <Image src={preview} className="preview-image" />
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveImage(index)}
                              className="remove-image-btn"
                            >
                              <FaTimes />
                            </Button>
                          </div>
                        ))}
                        {selectedImages.length > 0 && (
                          <div
                            className="image-preview-item add-more"
                            onClick={handleAddMoreImages}
                          >
                            <FaPlus className="add-icon" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="upload-container">
                        <FaPlus className="upload-icon" />
                        <p>{t("authentication.profile.uploadPrompt")}</p>
                        <Form.Control
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          required
                          className="d-none"
                          id="formFileUpload"
                        />
                        <label htmlFor="formFileUpload" className="upload-btn">
                          {t("authentication.profile.selectImages")}
                        </label>
                      </div>
                    )}

                    <Form.Control
                      type="file"
                      multiple
                      onChange={handleImageUpload}
                      ref={fileInputRef}
                      style={{ display: "none" }}
                    />
                  </Form.Group>

                  <Row className="form-actions">
                    {!isOAuthUser && (
                      <Col xs={6}>
                        <Button
                          type="button"
                          variant="outline-secondary"
                          className="back-btn"
                          onClick={() => setStep(1)}
                        >
                          <FaArrowLeft className="me-2" /> Back
                        </Button>
                      </Col>
                    )}
                    <Col xs={isOAuthUser ? 12 : 6}>
                      <Button
                        disabled={isSendingCode || isUpdating || isUploadingMultiple}
                        type="submit"
                        className="submit-btn"
                      >
                        {isSendingCode || isUpdating || isUploadingMultiple ? (
                          <>{t("authentication.profile.processing")}</>
                        ) : isOAuthUser ? (
                          <>Complete Profile <FaArrowRight className="ms-2" /></>
                        ) : (
                          <>
                            {t("authentication.account.continue")}{" "}
                            <FaArrowRight className="ms-2" />
                          </>
                        )}
                      </Button>
                    </Col>
                  </Row>

                  {(isSendingCode || isUpdating || isUploadingMultiple) && <Loader />}
                </Form>
              ) : !isOAuthUser ? (
                <div className="register-step-form">
                  <h2 className="step-title">
                    {t("authentication.verification.title")}
                  </h2>
                  <div className="verification-header">
                    <div className="verification-icon">
                      <FaUserPlus />
                    </div>
                    <p className="verification-message">
                      {t("authentication.verification.sentMessage")}
                      <br />
                      <strong>{email}</strong>
                    </p>
                  </div>

                  {!isCodeVerified ? (
                    <Form onSubmit={handleVerifyCode}>
                      <Form.Group
                        controlId="verificationCode"
                        className="form-group"
                      >
                        <Form.Label className="form-label">
                          {t("authentication.verification.verificationCode")}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          placeholder={t(
                            "authentication.verification.codePlaceholder"
                          )}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          required
                          className="form-control-custom verification-code-input"
                          maxLength={6}
                        />
                      </Form.Group>

                      <Button
                        type="submit"
                        className="submit-btn"
                        disabled={isVerifying}
                      >
                        {isVerifying
                          ? t("authentication.verification.verifying")
                          : t("authentication.verification.verifyButton")}
                      </Button>

                      <div className="resend-section">
                        <Button
                          variant="link"
                          onClick={handleSendVerificationCode}
                          disabled={isSendingCode}
                          className="resend-link"
                        >
                          {isSendingCode
                            ? t("authentication.verification.sending")
                            : t("authentication.verification.resendCode")}
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="outline-secondary"
                        className="back-btn w-100"
                        onClick={() => setStep(2)}
                      >
                        <FaArrowLeft className="me-2" />{" "}
                        {t("authentication.verification.backToProfile")}
                      </Button>

                      {isVerifying && <Loader />}
                    </Form>
                  ) : (
                    <div>
                      <div className="success-alert">
                        <FaCheckCircle className="success-icon" />
                        <p>
                          <strong>{t("authentication.toasts.emailVerified")}</strong>
                          <br />
                          {t("authentication.verification.completePrompt")}
                        </p>
                      </div>

                      <Button
                        onClick={handleFinalRegistration}
                        className="submit-btn success-btn"
                        disabled={isRegistering || isUploadingMultiple}
                      >
                        {isRegistering || isUploadingMultiple
                          ? t("authentication.profile.processing")
                          : t("authentication.verification.completeRegistration")}
                      </Button>

                      {(isRegistering || isUploadingMultiple) && <Loader />}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register;
