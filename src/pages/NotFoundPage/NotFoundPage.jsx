import { Link } from "react-router-dom";
// import logo from '../../assets/logo.png';
import not_found from '../../assets/not_found.png';
import "./NotFoundPage.css";

const NotFoundPage = () => {
  return (
    <div className="notfound-wrapper" style={{ backgroundImage: `url(${not_found})` }}>
      <main className="notfound-main">
        <h1 className="notfound-title">Lost your way?</h1>
        <p className="notfound-text">
          Sorry, we can&apos;t find that page. You&apos;ll find lots to explore on the home page.
        </p>
        <Link to={"/"} className="notfound-home-btn">
          Home
        </Link>
      </main>
    </div>
  );
};

export default NotFoundPage;
