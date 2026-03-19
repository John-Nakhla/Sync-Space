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
    padding: "40px",
    maxWidth: "1000px",
    margin: "0 auto",
  },
};

export default MainLayout;