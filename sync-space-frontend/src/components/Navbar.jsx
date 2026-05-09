import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <h2>SyncSpace</h2>

      <div style={styles.links}>
        <Link to="/">Home</Link>

        {!token ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Signup</Link>
          </>
        ) : (
          <>
            <Link to="/my-rooms">My Rooms</Link>

            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "15px 30px",
    backgroundColor: "#222",
    color: "white",
    alignItems: "center",
  },
  links: {
    display: "flex",
    gap: "15px",
    alignItems: "center",
  },
  logoutBtn: {
    backgroundColor: "red",
    color: "white",
    border: "none",
    padding: "6px 10px",
    cursor: "pointer",
    borderRadius: "4px",
  },
};

export default Navbar;