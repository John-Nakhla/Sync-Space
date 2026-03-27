import axios from "axios";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const response = await api.post(
        "/api/auth/login",
        {
          email: email,
          password: password,
        }
      );

      const token = response.data.token;

      localStorage.setItem("token", token);

      navigate("/dashboard");

    } catch (err) {
      setError("Invalid email or password");
    }
  };
}