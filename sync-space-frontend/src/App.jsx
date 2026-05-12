import { Routes, Route } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoomHub from './pages/RoomHub'; 

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MyRooms from "./pages/MyRooms";
import ChatRoom from "./pages/ChatRoom"; 

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>

        {/* Public Routes */}
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="my-rooms" element={<MyRooms />} />
          <Route path="room/:roomId" element={<RoomHub />} />
          <Route path="chat/:roomId" element={<ChatRoom />} />
        </Route>

      </Route>

      <Route path="*" element={<h1>404 Not Found</h1>} />
    </Routes>
  );
}

export default App;