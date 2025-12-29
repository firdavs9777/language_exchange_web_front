import { useEffect, useState } from "react";
import FormContainer from "../../composables/FormContainer";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useLoginUserMutation } from "../../store/slices/usersSlice";
import { setCredentials } from "../../store/slices/authSlice";
import { Bounce, toast } from "react-toastify";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";
import Loader from "../Loader";
import { useTranslation } from "react-i18next";
import "./Login.scss";

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loginUser, { isLoading }] = useLoginUserMutation();
  const { userInfo } = useSelector((state: any) => state.auth);
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const redirect = sp.get("redirect") || "/";

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [userInfo, redirect, navigate]);

  const submitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const userInfo = await loginUser({ email, password }).unwrap();
      const ActionPayload: Response | any = userInfo;
      dispatch(setCredentials({ ...ActionPayload }));
      toast.success(t("authentication.login.successMessage"), {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
      navigate(redirect);
    } catch (error: any) {
      if (error instanceof Error) {
        toast(error.message, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
      } else {
        toast(t("authentication.login.invalidCredentialsError"), {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
      }
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint (matching your backend routes)
    const backendUrl = "https://api.banatalk.com";
    // Store redirect in sessionStorage to retrieve after OAuth callback
    sessionStorage.setItem("oauth_redirect", redirect);
    window.location.href = `${backendUrl}/api/v1/auth/google`;
  };

  const clickHandler = () => {
    setShowPass((prev) => !prev);
  };

  return (
    <div className="login-page">
      <FormContainer>
        <Form onSubmit={submitHandler} className="login-form">
          <h1 className="login-title">{t("authentication.login.title")}</h1>

          {/* Google Login Button */}
          <Button
            variant="outline-danger"
            className="google-login-btn"
            onClick={handleGoogleLogin}
            type="button"
          >
            <FaGoogle className="google-icon" />
            {t("authentication.login.signInWithGoogle")}
          </Button>

          {/* Divider */}
          <div className="divider">
            <hr className="divider-line" />
            <span className="divider-text">
              {t("authentication.login.orText")}
            </span>
            <hr className="divider-line" />
          </div>

          <Form.Group controlId="email" className="form-group">
            <Form.Label className="form-label">
              {t("authentication.login.emailLabel")}
            </Form.Label>
            <Form.Control
              type="email"
              placeholder={t("authentication.login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-control-custom"
            />
          </Form.Group>

          <Form.Group controlId="password" className="form-group">
            <Form.Label className="form-label">
              {t("authentication.login.passwordLabel")}
            </Form.Label>
            <InputGroup className="password-input-group">
              <Form.Control
                type={showPass ? "text" : "password"}
                placeholder={t("authentication.login.passwordPlaceholder")}
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
          </Form.Group>

          <Row className="forgot-password-row">
            <Col className="text-end">
              <Link to="/forgot-password" className="forgot-password-link">
                {t("authentication.login.forgotPassword")}
              </Link>
            </Col>
          </Row>

          <Button
            disabled={isLoading}
            type="submit"
            variant="primary"
            className="submit-btn"
          >
            {isLoading
              ? t("authentication.login.signingInButton")
              : t("authentication.login.signInButton")}
          </Button>

          {isLoading && <Loader />}

          <Row className="register-row">
            <Col className="text-center">
              <span className="register-text">
                {t("authentication.login.newUserText")}{" "}
                <Link
                  to={redirect ? `/register?redirect=${redirect}` : `/register`}
                  className="register-link"
                >
                  {t("authentication.login.registerLink")}
                </Link>
              </span>
            </Col>
          </Row>
        </Form>
      </FormContainer>
    </div>
  );
};

export default Login;
