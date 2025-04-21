export async function getContentBasedRecommendations(movieShowTitle) {
  try {
    const response = await fetch(
      `/api/recommendations?movieShowTitle=${encodeURIComponent(movieShowTitle)}`
    );
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const recommendations = await response.json();
    return recommendations;
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return [];
  }
}
