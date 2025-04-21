import { useEffect, useState, useRef } from "react";
import "./Player.css";
import { Link, useParams } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import ReactPlayer from "react-player";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useContentTypeStore from "../../components/useContentTypeStore";
import { tmdbOptions } from "../../tmdb";
import { getContentBasedRecommendations } from "../../contentRecommender";

const SMALL_IMG_BASE_URL = "https://image.tmdb.org/t/p/w500";
const ORIGINAL_IMG_BASE_URL = "https://image.tmdb.org/t/p/original";

function formatReleaseDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const Player = () => {
  const { id } = useParams();
  const { contentType } = useContentTypeStore();

  const [trailers, setTrailers] = useState([]);
  const [currentTrailerIdx, setCurrentTrailerIdx] = useState(0);

  // Overall page loading (for the main content details):
  const [loading, setLoading] = useState(true);

  // The content details from TMDB:
  const [content, setContent] = useState({});

  // The similar content results:
  const [similarContent, setSimilarContent] = useState([]);
  // We track a loading state specifically for the "similar" section:
  const [similarLoading, setSimilarLoading] = useState(false);

  // We also track if we found the item in our dataset or not:
  const [foundInDataset, setFoundInDataset] = useState(false);

  const sliderRef = useRef(null);

  // 1) Fetch trailers
  useEffect(() => {
    fetch(
      `https://api.themoviedb.org/3/${contentType}/${id}/videos?language=en-US`,
      tmdbOptions
    )
      .then((res) => res.json())
      .then((data) => {
        setTrailers(data.results || []);
      })
      .catch((err) => {
        console.error("No trailers found", err);
      });
  }, [id, contentType]);

  // 2) Fetch content details
  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/${contentType}/${id}?language=en-US`, tmdbOptions)
      .then((res) => res.json())
      .then((data) => {
        setContent(data || {});
      })
      .catch((err) => {
        console.error("No content details", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, contentType]);

  // 3) Fetch similar content:
  //    Priority: use content-based recommendations first; if empty, fallback to TMDB's "similar" endpoint.
  useEffect(() => {
    if (!content || (!content.title && !content.name)) return;
    const movieShowName = content.title || content.name;

    setSimilarLoading(true); // Start loading spinner for similar section

    getContentBasedRecommendations(movieShowName)
      .then((recommendedTitles) => {
        if (recommendedTitles && recommendedTitles.length > 0) {
          // Mark that we found the item in our dataset:
          setFoundInDataset(true);

          // For each recommended title, fetch movie details from TMDB:
          Promise.all(
            recommendedTitles.map((title) =>
              fetch(
                `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(
                  title
                )}&include_adult=false&language=en-US&page=1`,
                tmdbOptions
              ).then((res) => res.json())
            )
          )
            .then((results) => {
              const recommendedMovies = [];
              results.forEach((result) => {
                if (result.results && result.results.length > 0) {
                  recommendedMovies.push(result.results[0]);
                }
              });
              setSimilarContent(recommendedMovies);
            })
            .catch((err) => {
              console.error("Error fetching recommended movies from TMDB:", err);
              setSimilarContent([]);
            })
            .finally(() => {
              setSimilarLoading(false);
            });
        } else {
          // If no content-based recs => fallback to TMDB similar
          setFoundInDataset(false);

          fetch(
            `https://api.themoviedb.org/3/${contentType}/${id}/similar?language=en-US&page=1`,
            tmdbOptions
          )
            .then((res) => res.json())
            .then((data) => {
              setSimilarContent(data.results || []);
            })
            .catch((err) => {
              console.error("Error fetching similar content from TMDB", err);
              setSimilarContent([]);
            })
            .finally(() => {
              setSimilarLoading(false);
            });
        }
      })
      .catch((err) => {
        console.error("Error in content-based recommendations", err);
        // If error => fallback to TMDB "similar"
        setFoundInDataset(false);

        fetch(
          `https://api.themoviedb.org/3/${contentType}/${id}/similar?language=en-US&page=1`,
          tmdbOptions
        )
          .then((res) => res.json())
          .then((data) => {
            setSimilarContent(data.results || []);
          })
          .catch((err2) => {
            console.error("Error fetching similar content from TMDB", err2);
            setSimilarContent([]);
          })
          .finally(() => {
            setSimilarLoading(false);
          });
      });
  }, [id, contentType, content]);

  // 4) Trailer navigation
  const handleNextTrailer = () => {
    if (currentTrailerIdx < trailers.length - 1) {
      setCurrentTrailerIdx(currentTrailerIdx + 1);
    }
  };

  const handlePrevTrailer = () => {
    if (currentTrailerIdx > 0) {
      setCurrentTrailerIdx(currentTrailerIdx - 1);
    }
  };

  // 5) Similar content slider scroll
  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: -sliderRef.current.offsetWidth,
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: sliderRef.current.offsetWidth,
        behavior: "smooth",
      });
    }
  };

  // 6) Loading skeleton for the entire page
  if (loading) {
    return (
      <div className="player-loading">
        <Navbar />
        <div className="animate-pulse">
          <div className="skel-1 shimmer"></div>
          <div className="skel-2 shimmer"></div>
          <div className="skel-3 shimmer"></div>
          <div className="skel-4 shimmer"></div>
          <div className="skel-5 shimmer"></div>
        </div>
      </div>
    );
  }

  // 7) If no content or missing poster => error state
  if (!content || !content.poster_path) {
    return (
      <div className="player-error">
        <Navbar />
        <div className="error-message">
          <h2>Content not found 😥</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="player-wrapper">
      <header className="navbar-container">
        <Navbar />
      </header>
      <div className="player-container">
        {/* Trailer controls */}
        {trailers.length > 0 && (
          <div className="trailer-controls">
            <button
              className={`trailer-button ${
                currentTrailerIdx === 0 ? "disabled" : ""
              }`}
              disabled={currentTrailerIdx === 0}
              onClick={handlePrevTrailer}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              className={`trailer-button ${
                currentTrailerIdx === trailers.length - 1 ? "disabled" : ""
              }`}
              disabled={currentTrailerIdx === trailers.length - 1}
              onClick={handleNextTrailer}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}

        {/* Video container */}
        <div className="video-container">
          {trailers.length > 0 && (
            <ReactPlayer
              controls={true}
              width="100%"
              height="70vh"
              className="react-player"
              url={`https://www.youtube.com/watch?v=${trailers[currentTrailerIdx].key}`}
            />
          )}
          {trailers?.length === 0 && (
            <h2 className="no-trailer">
              No trailers available for{" "}
              <span className="content-title">
                {content?.title || content?.name}
              </span>{" "}
              😥
            </h2>
          )}
        </div>

        {/* Content Details */}
        <div className="content-details">
          <div className="details-text">
            <h2 className="details-title">
              {content?.title || content?.name}
            </h2>
            <p className="details-date">
              {formatReleaseDate(
                content?.release_date || content?.first_air_date
              )}{" "}
              |{" "}
              {content?.adult ? (
                <span className="adult">18+</span>
              ) : (
                <span className="pg">PG-13</span>
              )}
            </p>
            <p className="details-overview">{content?.overview}</p>
          </div>
          <img
            src={ORIGINAL_IMG_BASE_URL + content?.poster_path}
            alt="Poster image"
            className="details-poster"
          />
        </div>

        {/* Similar content */}
        {similarLoading ? (
          // Show a small spinner or skeleton for the "Similar" section
          <div className="similar-content" style={{ marginTop: "2rem" }}>
            <h3 className="similar-title">Loading Similar Content...</h3>
            <div className="animate-pulse">
              <div className="skel-1 shimmer"></div>
              <div className="skel-2 shimmer"></div>
            </div>
          </div>
        ) : similarContent.length > 0 ? (
          <div className="similar-content">
            {/* 
              If foundInDataset = true => "Recommended from the dataset"
              Otherwise => "XYZ not found in dataset, recommending from TMDB"
            */}
            {foundInDataset ? (
              <h3 className="similar-title">Recommended from the Dataset</h3>
            ) : (
              <h3 className="similar-title">
                <span style={{ color: "#ec7404" }}>
                  {content.title || content.name}
                </span>{" "}
                not found in dataset, recommending from TMDB
              </h3>
            )}

            <div className="similar-slider-wrapper">
              <div className="similar-slider" ref={sliderRef}>
                {similarContent.map((item) => {
                  if (!item || !item.poster_path) return null;
                  return (
                    <Link
                      key={item.id}
                      to={`/player/${item.id}`}
                      className="similar-card"
                    >
                      <div className="card-img-container">
                        <img
                          src={SMALL_IMG_BASE_URL + item.poster_path}
                          alt="Poster path"
                          className="similar-card-img"
                        />
                      </div>
                      <h4 className="similar-card-title">
                        {item.title || item.name}
                      </h4>
                    </Link>
                  );
                })}
              </div>
              <ChevronRight
                className="similar-arrow right"
                onClick={scrollRight}
                size={24}
              />
              <ChevronLeft
                className="similar-arrow left"
                onClick={scrollLeft}
                size={24}
              />
            </div>
          </div>
        ) : (
          // If no similar content at all:
          <div className="similar-content" style={{ marginTop: "2rem" }}>
            <h3 className="similar-title">No similar content found 😥</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default Player;
