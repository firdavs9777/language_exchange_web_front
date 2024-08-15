import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FormContainer from "../../composables/FormContainer";
import { Button, Col, Form, InputGroup, Row } from "react-bootstrap";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import {
  AuthInfo,
  useLoginUserMutation,
  useRegisterUserMutation,
} from "../../store/slices/usersSlice";
import { UseSelector, useDispatch, useSelector } from "react-redux";
import Loader from "../Loader";
import { setCredentials } from "../../store/slices/authSlice";
import { toast } from "react-toastify";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPassTwo, setShowPassTwo] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [registerUser, { isLoading }] = useRegisterUserMutation();

  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const redirect = sp.get("redirect") || "/";

  const submitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password != confirmPassword) {
      toast.error("Passwords do not match");
      return;
    } else {
      try {
        const userInfo = await registerUser({ name, email, password }).unwrap();
        const ActionPayload: Response | any = userInfo;
        dispatch(setCredentials({ ...ActionPayload }));
        navigate(redirect);
        // Handle successful login (e.g., redirect to dashboard, store token in localStorage, etc.)
      } catch (error: any) {
        toast(error.data.message || error.error);
        // Handle login error (e.g., show error message)
      }
    }
  };
  const clickHandler = () => {
    setShowPass((prev) => !prev);
  };
  const clickHandlerConfirm = () => {
    setShowPassTwo((prev) => !prev);
  };
  return (
    <FormContainer>
      <h1>Register</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group controlId="name" className="my-4">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          ></Form.Control>
        </Form.Group>
        <Form.Group controlId="email" className="my-4">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          ></Form.Control>
        </Form.Group>
        <Form.Group controlId="password" className="my-4">
          <Form.Label>Password</Form.Label>
          <InputGroup>
            <Form.Control
              type={showPass ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <InputGroup.Text onClick={clickHandler}>
              {showPass ? <FaEyeSlash /> : <FaEye />}
            </InputGroup.Text>
          </InputGroup>
        </Form.Group>
        <Form.Group controlId="confirmPassword" className="my-4">
          <Form.Label>Password</Form.Label>
          <InputGroup>
            <Form.Control
              type={showPassTwo ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <InputGroup.Text onClick={clickHandlerConfirm}>
              {showPassTwo ? <FaEyeSlash /> : <FaEye />}
            </InputGroup.Text>
          </InputGroup>
        </Form.Group>
        <Button disabled={isLoading} type="submit" variant="success">
          Sign In
        </Button>

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
    </FormContainer>
  );
};
export default Register;
