import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-text">
          Built by{" "}
          <a
            href=""
            target="_blank"
            rel="noreferrer"
            className="footer-link"
          >
            Omar
          </a>
          . The source code coming soon on{" "}
          <a
            href=""
            target="_blank"
            rel="noreferrer"
            className="footer-link"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </footer>
  );
};

export default Footer;
