import { useEffect, useState } from "react";
import "./Home.css";
import Navbar from "../../components/Navbar/Navbar";
import info_icon from '../../assets/info_icon.png';
import TitleCards from "../../components/TitleCards/TitleCards";
import Footer from "../../components/Footer/Footer";
import useContentTypeStore from "../../components/useContentTypeStore";
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { tmdbOptions } from "../../tmdb";

// Firebase imports
import {
  auth,
  db,
  computeAndStoreRecommendations,
  getUserRecommendations,
} from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const ORIGINAL_IMG_BASE_URL = "https://image.tmdb.org/t/p/original";

const Home = () => {
  const { contentType } = useContentTypeStore();
  const [trendingContent, setTrendingContent] = useState(null);

  // For manual "fetch recs" button
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Track whether user has actually pressed the "Show me recommended" button
  const [didPressRecsButton, setDidPressRecsButton] = useState(false);

  // We'll keep recommended items in separate states
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [recommendedTv, setRecommendedTv] = useState([]);
  // We'll also track their "source" items (the searchHistory items that produced them)
  const [recommendationSourcesMovies, setRecommendationSourcesMovies] = useState([]);
  const [recommendationSourcesTv, setRecommendationSourcesTv] = useState([]);

  // 1) Fetch trending content
  useEffect(() => {
    fetch(
      `https://api.themoviedb.org/3/trending/${contentType}/day?language=en-US`,
      tmdbOptions
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.results && data.results.length > 0) {
          const randomCard =
            data.results[Math.floor(Math.random() * data.results.length)];
          setTrendingContent(randomCard);
        } else {
          console.error("No results found in the response.");
        }
      })
      .catch((err) => {
        console.error("Error fetching trending data:", err);
      });
  }, [contentType]);

  // 2) Button handler to manually compute recs
  const handleFetchRecs = async () => {
    setLoadingRecs(true);
    setDidPressRecsButton(true); // Mark that the user has pressed the button

    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user logged in, cannot fetch recommendations.");
        setLoadingRecs(false);
        return;
      }

      // Query user doc
      const q = query(collection(db, "users"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.log("No user doc found in Firestore for logged-in user.");
        setLoadingRecs(false);
        return;
      }

      // Actually compute the recommendations (movies + tv)
      const userDocId = snapshot.docs[0].id;
      await computeAndStoreRecommendations(userDocId);

      // Now read them from Firestore
      const {
        recommendedMovies: recMovies,
        recommendedTv: recTv,
        recommendationSourcesMovies: srcMovies,
        recommendationSourcesTv: srcTv,
      } = await getUserRecommendations();

      // Store them in state
      setRecommendedMovies(recMovies);
      setRecommendedTv(recTv);
      setRecommendationSourcesMovies(srcMovies);
      setRecommendationSourcesTv(srcTv);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Optional: spinner overlay while loading
  const renderLoadingOverlay = () => (
    <div className="recommend-loader-container">
      <div className="recommend-loader-spinner">
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );

  return (
    <div className="home">
      <Navbar />

      <div className="hero">
        {trendingContent ? (
          <>
            {/* Display the trending card's backdrop image */}
            <img
              src={ORIGINAL_IMG_BASE_URL + trendingContent.backdrop_path}
              alt={
                trendingContent.title ||
                trendingContent.name ||
                trendingContent.original_title ||
                trendingContent.original_name ||
                "Trending Card"
              }
              className="banner-img"
            />
            <div className="hero-caption">
              <h1>
                {trendingContent.title ||
                  trendingContent.name ||
                  trendingContent.original_title ||
                  trendingContent.original_name}
              </h1>
              <p className='mt-2 text-lg'>
                {trendingContent.release_date?.split("-")[0] ||
                 trendingContent.first_air_date?.split("-")[0]}{" "}
                | {trendingContent.adult ? "18+" : "PG-13"}
              </p>

              <p>
                {trendingContent.overview.length > 200
                  ? trendingContent.overview.slice(0, 200) + "..."
                  : trendingContent.overview}
              </p>
              <div className="hero-btns">
                <Link to={`/player/${trendingContent.id}`} className="btn dark-btn">
                  <img src={info_icon} alt="Info Icon" /> More Info
                </Link>
              </div>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.3 }}
            className="white-screen"
          >
            <Navbar />
            <div className="banner-img-loading" />
          </motion.div>
        )}
      </div>

      <div className="hero-overlay">
        <TitleCards
          title={`Popular ${contentType === "tv" ? "TV" : "Movies"}`}
          category="popular"
        />
      </div>

      <div className="more-cards">
        <div className="spacer"></div>
        <TitleCards
          title={`Top Rated ${contentType === "tv" ? "TV" : "Movies"}`}
          category="top_rated"
        />

        {contentType === "tv" ? (
          <>
            <TitleCards title="Airing Today TV" category="airing_today" />
            <TitleCards title="On The Air TV" category="on_the_air" />
          </>
        ) : (
          <>
            <TitleCards title="Upcoming Movies" category="upcoming" />
            <TitleCards title="Now Playing Movies" category="now_playing" />
          </>
        )}

        {/* If we haven't fetched recs yet AND not loading, show the button. */}
        {recommendedMovies.length === 0 && recommendedTv.length === 0 && !loadingRecs && !didPressRecsButton && (
          <div className="recommend-button-container">
            <button onClick={handleFetchRecs} className="recommend-button">
              Show me recommended movies/shows
            </button>
          </div>
        )}

        {/* If we are currently loading, show the spinner overlay */}
        {loadingRecs && renderLoadingOverlay()}

        {/*
          If the user pressed the button, and we finished loading,
          but recommended arrays are still empty => show "Content not found 😥"
        */}
        {didPressRecsButton && !loadingRecs && recommendedMovies.length === 0 && recommendedTv.length === 0 && (
          <div className="recommend-button-container" style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p>Content not found 😥</p>
          </div>
        )}

        {/* If we do have recommended TV or movies, show them */}
        {recommendedTv.length > 0 && (
          contentType === "tv" ? (
            <div className="recommended-section">
              <TitleCards
                title={`Recommended TV (source: ${recommendationSourcesTv.join(", ")})`}
                recommendedMovies={recommendedTv}
              />
            </div>
          ) : (
            <div className="recommended-section">
              <TitleCards
                title={`Recommended Movies (source: ${recommendationSourcesMovies.join(", ")})`}
                recommendedMovies={recommendedMovies}
              />
            </div>
          )
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Home;
