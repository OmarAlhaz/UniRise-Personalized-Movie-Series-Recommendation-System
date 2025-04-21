import { useEffect, useRef, useState } from 'react';
import './Navbar.css';
import logo from '../../assets/logo.png';
import search_icon from '../../assets/search_icon.svg';
import profile_img from '../../assets/profile_img.png';
import { logout } from '../../firebase';
import { Link } from 'react-router-dom';
import { LogOut, Menu } from "lucide-react";
import useContentTypeStore from '../../components/useContentTypeStore';

const Navbar = () => {
  const navRef = useRef();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get the setter from our store.
  const { setContentType } = useContentTypeStore();

  // Function to update nav-dark class based on scroll position and mobile menu state.
  const updateNavClass = () => {
    if (isMobileMenuOpen || window.scrollY >= 80) {
      navRef.current.classList.add('nav-dark');
    } else {
      navRef.current.classList.remove('nav-dark');
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', updateNavClass);
    updateNavClass();
    return () => {
      window.removeEventListener('scroll', updateNavClass);
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    if (newState || window.scrollY >= 80) {
      navRef.current.classList.add('nav-dark');
    } else {
      navRef.current.classList.remove('nav-dark');
    }
  };

  return (
    <div ref={navRef} className="navbar">
      <div className="navbar-left">
        <Link to="/">
          <img src={logo} alt="Logo" />
        </Link>
        <ul>
          <Link to="/" onClick={() => setContentType("movie")}><li>Movies</li></Link>
          <Link to="/" onClick={() => setContentType("tv")}><li>Tv Shows</li></Link>
          <Link to="/history"><li>Search History</li></Link>
        </ul>
      </div>
      <div className="navbar-right">
        <Link to="/search" className="search-link">
          <img src={search_icon} alt="Search" className="icons" />
        </Link>
        <div className="navbar-profile">
          <img src={profile_img} alt="Profile" className="profile" />
          <LogOut className="icons" onClick={() => logout()} />
        </div>
        <div className="mobile-menu">
          <Menu className="icons" onClick={toggleMobileMenu} />
        </div>
      </div>
      {/* Always render the mobile dropdown and toggle its visibility via class */}
      <div className={`mobile-dropdown ${isMobileMenuOpen ? "mobile-dropdown--open" : ""}`}>
        <ul>
          <Link to={"/"} onClick={() => {toggleMobileMenu();setContentType("movie");}}><p>Movies</p></Link>
          <Link to={"/"} onClick={() => {toggleMobileMenu();setContentType("tv");}}><p>Tv Shows</p></Link>
          <Link to={"/history"} onClick={toggleMobileMenu}><p>Search History</p></Link>
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
