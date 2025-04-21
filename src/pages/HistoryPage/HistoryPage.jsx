import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import { Trash } from "lucide-react";
import { toast } from "react-toastify";
import "./HistoryPage.css";
import { getSearchHistory, removeItemFromSearchHistory, auth } from "../../firebase";

const SMALL_IMG_BASE_URL = "https://image.tmdb.org/t/p/w500";

function formatDate(dateInput) {
  let date;
  if (dateInput && typeof dateInput.toDate === "function") {
    date = dateInput.toDate();
  } else {
    date = new Date(dateInput);
  }
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Intl.DateTimeFormat("en-US", options)
    .format(date)
    .replace(",", " ");
}

const HistoryPage = () => {
  const [searchHistory, setSearchHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // This tracks whether we're currently deleting an item
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const waitForUser = () => {
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });
    };

    const fetchHistory = async () => {
      const user = await waitForUser();
      if (!user) {
        setSearchHistory([]);
        setLoading(false);
        return;
      }
      getSearchHistory()
        .then((history) => {
          setSearchHistory(history || []);
          setLoading(false);
        })
        .catch(() => {
          setSearchHistory([]);
          setLoading(false);
        });
    };

    fetchHistory();
  }, []);

  const handleDelete = (entry) => {
    // Turn on the "deleting" spinner
    setIsDeleting(true);

    removeItemFromSearchHistory(entry.id)
      .then(() => {
        setSearchHistory(searchHistory.filter((item) => item.id !== entry.id));
      })
      .catch(() => {
        toast.error("Failed to delete search item");
      })
      .finally(() => {
        // Turn off the "deleting" spinner
        setIsDeleting(false);
      });
  };

  if (loading) {
    return (
      <div className="history-wrapper">
        <header className="history-navbar-container">
          <Navbar />
        </header>
        <div className="history-container">
          <div className="history-loader-container">
            <div className="history-loader-spinner">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (searchHistory.length === 0) {
    return (
      <div className="history-wrapper">
        <header className="history-navbar-container">
          <Navbar />
        </header>
        <div className="history-container">
          <h1 className="history-heading">Search History</h1>
          <div className="history-no-history">
            <p className="history-no-history-text">No search history found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-wrapper">
      <header className="history-navbar-container">
        <Navbar />
      </header>

      {/* If isDeleting is true, show a full-page overlay with the spinner */}
      {isDeleting && (
        <div className="history-loader-container">
          <div className="history-loader-spinner">
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      )}

      <div className="history-container">
        <h1 className="history-heading">Search History</h1>
        <div className="history-results-grid">
          {searchHistory.map((entry) => (
            <div key={entry.id} className="history-result-card">
              <img
                src={SMALL_IMG_BASE_URL + entry.image}
                alt="History"
                className="history-result-image"
              />
              <div className="history-result-info">
                <span className="history-result-title">{entry.title}</span>
                <span className="history-result-date">{formatDate(entry.createdAt)}</span>
              </div>
              <span
                className={`history-badge ${
                  entry.searchType === "movie"
                    ? "history-badge-movie"
                    : entry.searchType === "tv"
                    ? "history-badge-tv"
                    : "history-badge-person"
                }`}
              >
                {entry.searchType[0].toUpperCase() + entry.searchType.slice(1)}
              </span>
              <Trash
                className="history-trash-icon"
                onClick={() => handleDelete(entry)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
