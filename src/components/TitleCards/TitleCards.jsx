import { useEffect, useRef, useState } from "react";
import "./TitleCards.css";
import { Link } from "react-router-dom";
import useContentTypeStore from "../../components/useContentTypeStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { tmdbOptions } from "../../tmdb";
import { getContentBasedRecommendations } from "../../contentRecommender";

const SMALL_IMG_BASE_URL = "https://image.tmdb.org/t/p/w500";

const TitleCards = ({ title, category, recommendedFor, recommendedMovies }) => {
  const [apiData, setApiData] = useState([]);
  const [showArrows, setShowArrows] = useState(false);
  const cardsRef = useRef();
  const { contentType } = useContentTypeStore();

  useEffect(() => {
    if (recommendedMovies && recommendedMovies.length > 0) {
      // If recommendedMovies are passed (from Firestore), fetch movie details for each.
      Promise.all(
        recommendedMovies.map((recTitle) =>
          fetch(
            `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(
              recTitle
            )}&include_adult=false&language=en-US&page=1`,
            tmdbOptions
          )
            .then((res) => res.json())
            .then((data) =>
              data.results && data.results.length > 0
                ? data.results[0]
                : null
            )
        )
      )
        .then((movies) => {
          const validMovies = movies.filter((movie) => movie !== null);
          setApiData(validMovies.sort(() => Math.random() - 0.5));
        })
        .catch((err) =>
          console.error("Error fetching recommended movies:", err)
        );
    } else if (recommendedFor) {
      // Use the content-based recommender if recommendedFor is provided.
      getContentBasedRecommendations(recommendedFor)
        .then((recommendedTitles) => {
          if (recommendedTitles && recommendedTitles.length > 0) {
            Promise.all(
              recommendedTitles.map((recTitle) =>
                fetch(
                  `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(
                    recTitle
                  )}&include_adult=false&language=en-US&page=1`,
                  tmdbOptions
                )
                  .then((res) => res.json())
                  .then((data) =>
                    data.results && data.results.length > 0
                      ? data.results[0]
                      : null
                  )
              )
            )
              .then((movies) => {
                const validMovies = movies.filter((movie) => movie !== null);
                // Filter out the movie that matches the query so it isn’t recommended.
                const filteredMovies = validMovies.filter(
                  (movie) =>
                    movie.title.toLowerCase() !== recommendedFor.trim().toLowerCase()
                );
                setApiData(filteredMovies.sort(() => Math.random() - 0.5));
              })
              .catch((err) =>
                console.error("Error fetching recommended movies:", err)
              );
          } else {
            setApiData([]);
          }
        })
        .catch((err) =>
          console.error("Error in content-based recommendations:", err)
        );
    } else {
      // Normal behavior: fetch movies from a given category.
      fetch(
        `https://api.themoviedb.org/3/${contentType}/${category ? category : "now_playing"}?language=en-US&page=1`,
        tmdbOptions
      )
        .then((res) => res.json())
        .then((data) => {
          let results = data.results || [];
          results = results.filter((card) => {
            const hasImage = Boolean(card.backdrop_path);
            const hasTitle =
              contentType === "tv"
                ? Boolean(card.original_name)
                : Boolean(card.original_title);
            return hasImage && hasTitle;
          });
          results = results.sort(() => Math.random() - 0.5);
          setApiData(results);
        })
        .catch((err) => console.error("Error fetching movies:", err));
    }
  }, [contentType, category, recommendedFor, recommendedMovies]);

  const scrollLeft = () => {
    if (cardsRef.current) {
      cardsRef.current.scrollBy({
        left: -cardsRef.current.offsetWidth,
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (cardsRef.current) {
      cardsRef.current.scrollBy({
        left: cardsRef.current.offsetWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      className="title-cards"
      onMouseEnter={() => setShowArrows(true)}
      onMouseLeave={() => setShowArrows(false)}
    >
      <h2>{title ? title : "Popular"}</h2>
      <div className="card-list" ref={cardsRef}>
        {apiData.map((card, index) => {
          // Skip rendering if there's no backdrop_path
          if (!card.backdrop_path) return null;
  
          return (
            <Link to={`/player/${card.id}`} className="card group" key={index}>
              <div className="card-img-container">
                <img
                  src={SMALL_IMG_BASE_URL + card.backdrop_path}
                  alt=""
                  className="card-img"
                />
              </div>
              {contentType === "tv" ? (
                <p>{card.original_name}</p>
              ) : (
                <p>{card.original_title}</p>
              )}
            </Link>
          );
        })}
      </div>
  
      {showArrows && (
        <>
          <button className="arrow-button left" onClick={scrollLeft}>
            <ChevronLeft size={24} />
          </button>
          <button className="arrow-button right" onClick={scrollRight}>
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );  
};

export default TitleCards;
