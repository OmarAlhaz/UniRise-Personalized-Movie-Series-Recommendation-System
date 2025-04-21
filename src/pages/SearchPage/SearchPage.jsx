import { useState } from "react";
import useContentTypeStore from "../../components/useContentTypeStore";
import Navbar from "../../components/Navbar/Navbar";
import { Search } from "lucide-react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import "./SearchPage.css";
import { updateSearchHistory } from "../../firebase";
import { tmdbOptions } from "../../tmdb";

const ORIGINAL_IMG_BASE_URL = "https://image.tmdb.org/t/p/original";

const SearchPage = () => {
  const [activeTab, setActiveTab] = useState("movie");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setContentType } = useContentTypeStore();

  // Actor modal state
  const [selectedActor, setSelectedActor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [closing, setClosing] = useState(false);

  // Switch tabs
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setContentType(tab === "movie" ? "movie" : tab === "tv" ? "tv" : "person");
    setResults([]);
    setSubmitted(false);
  };

  /**
   * If user clicks a single result (Movie/TV/Person), store that item in history.
   */
  const handleResultClick = async (result) => {
    let image, title;
    if (activeTab === "person") {
      image = result.profile_path;
      title = result.name;
    } else if (activeTab === "tv") {
      image = result.poster_path;
      title = result.name;
    } else {
      // "movie"
      image = result.poster_path;
      title = result.title;
    }
    try {
      await updateSearchHistory({
        id: result.id,
        image,
        title,
        searchType: activeTab,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating search history", error);
      toast.error("Error updating search history");
    }
  };

  /**
   * Main search handler.
   * For Movies/TV => automatically store the first result in history.
   * For Person => do NOT store the first result automatically.
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setLoading(true);

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/${activeTab}?query=${encodeURIComponent(
          searchTerm
        )}&include_adult=false&language=en-US&page=1`,
        tmdbOptions
      );
      const data = await res.json();
      setResults(data.results || []);

      // If we found results:
      if (data.results && data.results.length > 0) {
        // Only store the first result automatically if it's movie/tv
        if (activeTab === "movie" || activeTab === "tv") {
          const firstResult = data.results[0];
          let image, title;
          if (activeTab === "tv") {
            image = firstResult.poster_path;
            title = firstResult.name;
          } else {
            // "movie"
            image = firstResult.poster_path;
            title = firstResult.title;
          }

          await updateSearchHistory({
            id: firstResult.id,
            image,
            title,
            searchType: activeTab,
            createdAt: new Date(),
          });
        }
        // If activeTab === "person", do nothing automatically
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        toast.error("Nothing found, make sure you are searching under the right category");
      } else {
        toast.error("An error occurred, please try again later");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * For Person: open the actor modal after fetching details
   */
  const handleActorClick = async (actorId) => {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/person/${actorId}?language=en-US&page=1`,
        tmdbOptions
      );
      if (!res.ok) {
        throw new Error("Failed to fetch actor details");
      }
      const actorData = await res.json();
      setSelectedActor(actorData);
      setShowModal(true);
    } catch (error) {
      toast.error("Error fetching actor details");
      console.error(error);
    }
  };

  // Close actor modal with fade-out
  const handleCloseModal = () => {
    setClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setClosing(false);
    }, 500);
  };

  return (
    <div className="searchpage-wrapper">
      <header className="navbar-container">
        <Navbar />
      </header>
      <div className="searchpage-container">
        {/* Tab buttons */}
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === "movie" ? "active" : ""}`}
            onClick={() => handleTabClick("movie")}
          >
            Movies
          </button>
          <button
            className={`tab-button ${activeTab === "tv" ? "active" : ""}`}
            onClick={() => handleTabClick("tv")}
          >
            TV Shows
          </button>
          <button
            className={`tab-button ${activeTab === "person" ? "active" : ""}`}
            onClick={() => handleTabClick("person")}
          >
            Person
          </button>
        </div>

        {/* Search form */}
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search for a ${activeTab}`}
            className="search-input"
          />
          <button type="submit" className="search-button">
            <Search className="search-icon" />
          </button>
        </form>

        {/* Loading or results */}
        {loading ? (
          <div className="loader-container">
            <div className="loader-spinner">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        ) : submitted && results.length === 0 ? (
          <div className="error-message">
            <h2>No Results found 😥</h2>
          </div>
        ) : (
          <div className="results-grid">
            {results.map((result) => {
              // skip if no image
              if (!result.poster_path && !result.profile_path) return null;

              // Person
              if (activeTab === "person") {
                return (
                  <div
                    key={result.id}
                    className="result-card"
                    onClick={() => {
                      // Only store Person in history on click
                      handleResultClick(result);
                      handleActorClick(result.id);
                    }}
                  >
                    <img
                      src={ORIGINAL_IMG_BASE_URL + result.profile_path}
                      alt={result.name}
                      className="result-image person-image"
                    />
                    <h2 className="result-title">{result.name}</h2>
                  </div>
                );
              }

              // Movie or TV
              return (
                <div key={result.id} className="result-card">
                  <Link
                    to={"/player/" + result.id}
                    onClick={() => {
                      // Also store on click, though we already stored the first result automatically
                      handleResultClick(result);
                      setContentType(activeTab);
                    }}
                    className="result-content"
                  >
                    <img
                      src={ORIGINAL_IMG_BASE_URL + result.poster_path}
                      alt={result.title || result.name}
                      className="result-image"
                    />
                    <h2 className="result-title">
                      {result.title || result.name}
                    </h2>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actor Modal */}
      {showModal && selectedActor && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className={`modal-content ${closing ? "fade-out" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={handleCloseModal}>
              &times;
            </button>
            <img
              src={ORIGINAL_IMG_BASE_URL + selectedActor.profile_path}
              alt={selectedActor.name}
              className="modal-actor-image"
            />
            <h2>{selectedActor.name}</h2>
            <p>
              <strong>Birthday: </strong>
              <span style={{ color: "orange" }}>
                {selectedActor.birthday || "N/A"}
              </span>
            </p>
            <p>
              <strong>Place of Birth: </strong>
              <span style={{ color: "orange" }}>
                {selectedActor.place_of_birth || "N/A"}
              </span>
            </p>
            <p>
              <strong>Biography:</strong>
            </p>
            <div className="actor-biography">
              <span>
                {selectedActor.biography || "No biography available."}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
