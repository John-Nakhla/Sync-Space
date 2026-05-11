import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <>
      <Navbar />
      <main style={styles.container}>
        <Outlet />
      </main>
    </>
  );
}

const styles = {
  container: {
    // no maxWidth, no margin auto, no padding here
    width: "100%",
    boxSizing: "border-box",
  },
};

export default MainLayout;