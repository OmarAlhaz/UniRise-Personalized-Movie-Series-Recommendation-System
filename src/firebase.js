import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
  arrayUnion,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { getContentBasedRecommendations } from "./contentRecommender";
import { tmdbOptions } from "./tmdb";
import { firebaseConfig } from "../config";

// ---------------------------------------------------------------------------
// 1. INITIALIZE FIREBASE
// ---------------------------------------------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// 2. SIGNUP / LOGIN / LOGOUT
// ---------------------------------------------------------------------------
const signup = async (name, email, password) => {
  if (!email || !password || !name) {
    toast.error("All fields are required");
    return;
  }
  // ... validation checks, etc. ...

  try {
    // Create user via Firebase Auth
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;

    // Also create a Firestore doc with empty arrays for searchHistory + recommended
    await addDoc(collection(db, "users"), {
      uid: user.uid,
      name,
      authProvider: "local",
      email,
      searchHistory: [],
      recommendedMovies: [],
      recommendedTv: [],
      recommendationSourcesMovies: [],
      recommendationSourcesTv: [],
    });
  } catch (error) {
    console.log("Error in signup", error);
    toast.error(error.code.split("/")[1].split("-").join(" "));
  }
};

const login = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.log("Error in login", error);
    toast.error(error.code.split("/")[1].split("-").join(" "));
  }
};

const logout = () => {
  signOut(auth);
};

// ---------------------------------------------------------------------------
// 3. HELPER: WAIT FOR USER
// ---------------------------------------------------------------------------
const waitForUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// ---------------------------------------------------------------------------
// 4. VALIDATE RECOMMENDED TITLES ON TMDB
// ---------------------------------------------------------------------------
async function validateTitleOnTmdb(title, searchType = "movie") {
  try {
    const url = `https://api.themoviedb.org/3/search/${searchType}?query=${encodeURIComponent(
      title
    )}&include_adult=false&language=en-US&page=1`;

    const response = await fetch(url, tmdbOptions);
    if (!response.ok) {
      console.error(`TMDB fetch failed for "${title}" (type=${searchType}):`, response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      // Take ONLY the first result
      const firstResult = data.results[0];
      
      // Check if it has a valid backdrop_path
      if (!firstResult.backdrop_path) {
        console.log(`"${title}" => first result has no backdrop_path => skipping`);
        return null;
      }

      // Return the official "title" (for movies) or "name" (for TV)
      return firstResult.title || firstResult.name || null;
    }
    // If no results at all, return null
    return null;
  } catch (err) {
    console.error(`Error validating "${title}" on TMDB:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 5. GATHER RECOMMENDATIONS FOR A GIVEN SET OF HISTORY ITEMS
// ---------------------------------------------------------------------------
/**
 * This helper picks up to 3 items from the array,
 * gets recs for each, validates them on TMDB,
 * and returns a deduplicated array of valid titles (up to 35).
 */
async function gatherRecsForItems(historyItems) {
  // 1) Shuffle
  const shuffled = [...historyItems].sort(() => Math.random() - 0.5);

  // 2) Pick up to 3 items
  const finalItems = [];
  let idx = 0;
  while (finalItems.length < 3 && idx < shuffled.length) {
    const item = shuffled[idx++];
    const test = await getContentBasedRecommendations(item.title);
    if (test && test.length > 0) {
      finalItems.push(item);
    }
  }
  if (finalItems.length === 0) {
    return { recs: [], sources: [] };
  }

  // 3) For each item, gather + validate
  let allRecs = [];
  for (const item of finalItems) {
    const recTitles = await getContentBasedRecommendations(item.title);
    const filtered = recTitles.filter(
      (r) => r.trim().toLowerCase() !== item.title.trim().toLowerCase()
    );
    const stype = item.searchType === "tv" ? "tv" : "movie";

    const validated = await Promise.all(
      filtered.map(async (rawTitle) => {
        const official = await validateTitleOnTmdb(rawTitle, stype);
        return official; // might be null
      })
    );
    // keep only non-null
    const valid = validated.filter((v) => v !== null);
    allRecs.push(...valid);
  }

  // 4) deduplicate, shuffle, slice top 35
  const unique = Array.from(new Set(allRecs.map((t) => t.trim())));
  const finalShuffle = unique.sort(() => Math.random() - 0.5);
  const top35 = finalShuffle.slice(0, 35);

  // 5) Return them plus the source item titles
  const sources = finalItems.map((it) => it.title);
  return { recs: top35, sources };
}

// ---------------------------------------------------------------------------
// 6. COMPUTE & STORE RECOMMENDATIONS
// ---------------------------------------------------------------------------
/**
 * We'll produce 2 separate arrays: recommendedMovies and recommendedTv.
 * Also store their respective "source" items.
 */
async function computeAndStoreRecommendations(userDocId) {
  const userRef = doc(db, "users", userDocId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    console.error("User doc not found in computeAndStoreRecommendations");
    return;
  }

  const userData = userSnap.data();
  const history = userData.searchHistory || [];

  // Split into movie items vs tv items
  const movieItems = history.filter((it) => it.searchType === "movie");
  const tvItems = history.filter((it) => it.searchType === "tv");

  // gather for movies
  const { recs: movieRecs, sources: movieSources } = await gatherRecsForItems(movieItems);
  // gather for tv
  const { recs: tvRecs, sources: tvSources } = await gatherRecsForItems(tvItems);

  // Now store them as recommendedMovies, recommendedTv, plus the sources
  await updateDoc(userRef, {
    recommendedMovies: movieRecs,
    recommendedTv: tvRecs,
    recommendationSourcesMovies: movieSources,
    recommendationSourcesTv: tvSources,
  });

  console.log("Updated user recs => movies:", movieRecs, "tv:", tvRecs);
}

// ---------------------------------------------------------------------------
// 7. UPDATE SEARCH HISTORY
// ---------------------------------------------------------------------------
const updateSearchHistory = async (searchItem) => {
  try {
    if (!auth.currentUser) throw new Error("User is not logged in");
    const q = query(collection(db, "users"), where("uid", "==", auth.currentUser.uid));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.error("User not found in Firestore");
      return;
    }

    const userDocRef = querySnapshot.docs[0].ref;
    const userData = querySnapshot.docs[0].data();
    const existingHistory = userData.searchHistory || [];

    // Check for duplicates
    const exists = existingHistory.some((item) => item.id === searchItem.id);
    if (exists) {
      console.log("Search item already exists in history");
      return;
    }

    // Add new item & reset recommended lists
    await updateDoc(userDocRef, {
      searchHistory: arrayUnion(searchItem),
      recommendedMovies: [],
      recommendedTv: [],
      recommendationSourcesMovies: [],
      recommendationSourcesTv: [],
    });
  } catch (error) {
    console.error("Error updating search history", error);
    toast.error("Error updating search history");
  }
};

// ---------------------------------------------------------------------------
// 8. GET SEARCH HISTORY
// ---------------------------------------------------------------------------
const getSearchHistory = async () => {
  try {
    if (!auth.currentUser) throw new Error("User is not logged in");
    const q = query(collection(db, "users"), where("uid", "==", auth.currentUser.uid));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) throw new Error("User not found in Firestore");
    const userData = querySnapshot.docs[0].data();
    return userData.searchHistory || [];
  } catch (error) {
    console.error("Error in getSearchHistory:", error);
    toast.error("Error fetching search history");
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 9. REMOVE ITEM FROM SEARCH HISTORY
// ---------------------------------------------------------------------------
const removeItemFromSearchHistory = async (itemId) => {
  // Same approach: remove item & reset recommended arrays
  try {
    if (!auth.currentUser) throw new Error("User is not logged in");
    const q = query(collection(db, "users"), where("uid", "==", auth.currentUser.uid));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error("User not found in Firestore");
    }

    const userDocRef = querySnapshot.docs[0].ref;
    const userData = querySnapshot.docs[0].data();
    const newSearchHistory = (userData.searchHistory || []).filter(
      (item) => item.id !== itemId
    );

    await updateDoc(userDocRef, {
      searchHistory: newSearchHistory,
      recommendedMovies: [],
      recommendedTv: [],
      recommendationSourcesMovies: [],
      recommendationSourcesTv: [],
    });

    return { success: true, message: "Item removed from search history" };
  } catch (error) {
    console.error("Error removing item from search history:", error);
    toast.error("Error removing item from search history");
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 10. GET USER RECOMMENDATIONS
// ---------------------------------------------------------------------------
const getUserRecommendations = async () => {
  try {
    const user = await waitForUser();
    if (!user) throw new Error("User is not logged in");

    const q = query(collection(db, "users"), where("uid", "==", user.uid));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) throw new Error("User not found in Firestore");

    const userData = querySnapshot.docs[0].data();
    return {
      recommendedMovies: userData.recommendedMovies || [],
      recommendedTv: userData.recommendedTv || [],
      recommendationSourcesMovies: userData.recommendationSourcesMovies || [],
      recommendationSourcesTv: userData.recommendationSourcesTv || [],
    };
  } catch (error) {
    console.error("Error in getUserRecommendations:", error);
    toast.error("Error fetching user recommendations: " + error.message);
    return {
      recommendedMovies: [],
      recommendedTv: [],
      recommendationSourcesMovies: [],
      recommendationSourcesTv: [],
    };
  }
};

// Export everything
export {
  auth,
  db,
  login,
  signup,
  logout,
  computeAndStoreRecommendations,
  updateSearchHistory,
  getSearchHistory,
  removeItemFromSearchHistory,
  getUserRecommendations,
};
