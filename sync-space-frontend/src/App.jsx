import { Routes, Route } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MyRooms from "./pages/MyRooms";

// FIX 1: Import the Room component we just built instead of ChatRoom
import Room from "./pages/Room"; 

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
          
          {/* FIX 2: Render <Room /> here instead of <ChatRoom /> */}
          <Route path="/room/:roomId" element={<Room />} />
          {/* <Route path="create-room" element={<CreateRoom />} />
          <Route path="join-room" element={<JoinRoom />} /> */}
          <Route path="my-rooms" element={<MyRooms />} />
          <Route path="/chat/:roomId" element={<ChatRoom />} />
        </Route>

      </Route>

      <Route path="*" element={<h1>404 Not Found</h1>} />
    </Routes>
  );
}

export default App;