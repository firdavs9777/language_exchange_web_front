import { useEffect, useState } from "react";
import FormContainer from "../../composables/FormContainer";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useLoginUserMutation } from "../../store/slices/usersSlice";
import { setCredentials } from "../../store/slices/authSlice";
import { Bounce, toast } from "react-toastify";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Loader from "../Loader";

const Login = () => {
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
      toast.success("Successfully logged in", {
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
        toast("Invalid credentials", {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
      }
    }
  };

  const clickHandler = () => {
    setShowPass((prev) => !prev);
  };

  return (
    <FormContainer>
      <Form onSubmit={submitHandler} className="p-4 m-4 shadow-lg rounded">
        <h1 className="mb-4 text-center">Sign In</h1>
        <Form.Group controlId="email" className="mb-3">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group controlId="password" className="mb-3">
          <Form.Label>Password</Form.Label>
          <InputGroup>
            <Form.Control
              type={showPass ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <InputGroup.Text onClick={clickHandler} className="password-toggle">
              {showPass ? <FaEyeSlash /> : <FaEye />}
            </InputGroup.Text>
          </InputGroup>
        </Form.Group>

        <Row className="mb-3">
          <Col className="text-end">
            <Link to="/forgot-password" className="text-muted">
              Forgot Password?
            </Link>
          </Col>
        </Row>

        <Button
          disabled={isLoading}
          type="submit"
          variant="primary"
          className="w-100"
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>

        {isLoading && <Loader />}

        <Row className="py-3 text-center">
          <Col>
            New User?{" "}
            <Link
              to={redirect ? `/register?redirect=${redirect}` : `/register`}
            >
              Register
            </Link>
          </Col>
        </Row>
      </Form>
    </FormContainer>
  );
};

export default Login;
