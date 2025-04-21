// imdb_scraper.js

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Enable stealth mode to help avoid detection
puppeteer.use(StealthPlugin());

// Define file paths for progress persistence, failed movies, and CSV output
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const progressFilePath = path.join(__dirname, 'imdb_progress_all.json');
const failedMissingFilePath = path.join(__dirname, 'imdb_failed_missing.json');
const csvFilePath = path.join(__dirname, 'imdb_movies_all.csv');

// Instead of a hard-coded list, define a startYear and endYear:
const startYear = 1960;
const endYear   = 2025;

// Build the array of years from startYear to endYear:
const targetYears = [];
for (let y = startYear; y <= endYear; y++) {
  targetYears.push(String(y));
}

// Helper: delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load previously processed movies and initialize a Map for quick lookup
let visitedMovies = [];
const processedMap = new Map();
if (fs.existsSync(progressFilePath)) {
  try {
    const savedProgress = fs.readFileSync(progressFilePath, 'utf8');
    visitedMovies = JSON.parse(savedProgress);
    visitedMovies.forEach(movie => processedMap.set(movie.movie_name, true));
    console.log(`Loaded progress with ${visitedMovies.length} movies.`);
  } catch {
    console.error('Error reading progress file, starting fresh.');
  }
}

// Load previously failed movies (all failures in one place) into a Map
const failedMissingMap = new Map();
if (fs.existsSync(failedMissingFilePath)) {
  try {
    const savedFailedMissing = fs.readFileSync(failedMissingFilePath, 'utf8');
    const arr = JSON.parse(savedFailedMissing);
    arr.forEach(obj => failedMissingMap.set(obj.movie_name, obj.link));
    console.log(`Loaded ${failedMissingMap.size} failed movies (missing info or modal issues).`);
  } catch {
    console.error('Error reading failed missing file, starting with empty list.');
  }
}

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Loop over each target year
    for (const year of targetYears) {
      // Process month-by-month for the current year
      for (let month = 1; month <= 12; month++) {
        const mm = month < 10 ? '0' + month : month.toString();
        // Get last day of the month
        const lastDay = new Date(Number(year), month, 0).getDate();
        const startDate = `${year}-${mm}-01`;
        const endDate   = `${year}-${mm}-${lastDay}`;

        // Build the URL for the current month
        const listUrl = `https://www.imdb.com/search/title/?title_type=feature,tv_series&release_date=${startDate},${endDate}&user_rating=5,10&languages=en&sort=year,asc`;
        console.log(`\n=== Processing movies for ${year}-${mm} (${startDate} to ${endDate}) ===`);
        await page.goto(listUrl, { waitUntil: 'networkidle2' });

        // Accept cookie consent if available
        try {
          await page.waitForSelector('button[data-testid="accept-button"]', { timeout: 10000 });
          await page.click('button[data-testid="accept-button"]');
          console.log('Cookie consent accepted.');
          await delay(1000);
        } catch {
          console.log('Cookie consent accept button not found, proceeding...');
        }

        // Define selectors for the info buttons and "50 more" button
        const infoButtonSelector = 'button.ipc-icon-button.li-info-icon.ipc-icon-button--base.ipc-icon-button--onAccent2';
        const moreButtonSelector = 'button.ipc-btn.ipc-btn--single-padding.ipc-btn--center-align-content.ipc-btn--default-height.ipc-btn--core-base.ipc-btn--theme-base.ipc-btn--button-radius.ipc-btn--on-accent2.ipc-text-button.ipc-see-more__button';

        // Process movies on the current month page
        while (true) {
          await page.waitForSelector(infoButtonSelector, { visible: true, timeout: 5000 });
          const moviesOnPage = await page.$$eval('li.ipc-metadata-list-summary-item', (lis) =>
            lis.map((li, index) => {
              const h3 = li.querySelector('h3.ipc-title__text');
              let movieName = h3 ? h3.innerText.replace(/^\d+\.\s*/, '').trim() : null;
              const a = li.querySelector('a.ipc-title-link-wrapper');
              let movieLink = a ? a.getAttribute('href') : '';
              if (movieLink && movieLink.startsWith('/')) {
                movieLink = 'https://www.imdb.com' + movieLink;
              }
              if (movieLink && movieLink.includes('?')) {
                movieLink = movieLink.split('?')[0];
              }
              return { movieName, movieLink, index };
            })
          );
          console.log(`Found ${moviesOnPage.length} movies on this page.`);

          // Filter out already processed or failed
          const unprocessedMovies = moviesOnPage.filter(
            item =>
              item.movieName &&
              !processedMap.has(item.movieName) &&
              !failedMissingMap.has(item.movieName)
          );
          console.log(`${unprocessedMovies.length} movies remain to be processed on this page.`);

          for (const item of unprocessedMovies) {
            // Use nth-of-type selector to target the specific movie's info button
            const infoButtonSel = `li.ipc-metadata-list-summary-item:nth-of-type(${item.index + 1}) button.ipc-icon-button.li-info-icon.ipc-icon-button--base.ipc-icon-button--onAccent2`;
            const infoButtonHandles = await page.$$(infoButtonSel);
            if (!infoButtonHandles || infoButtonHandles.length === 0) {
              console.log(`No info button found for "${item.movieName}", skipping.`);
              continue;
            }
            const infoButton = infoButtonHandles[0];
            console.log(`\nProcessing movie: "${item.movieName}"`);

            let modalOpened = false;
            let skipImmediately = false;
            const modalTitleSelector = 'h3.ipc-title__text.prompt-title-text';
            let attempts = 0;
            const maxAttempts = 5;

            while (!modalOpened && attempts < maxAttempts) {
              attempts++;
              try {
                await infoButton.evaluate(btn => btn.scrollIntoView({ block: 'center', inline: 'center' }));
                const box = await infoButton.boundingBox();
                if (box) {
                  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                } else {
                  await infoButton.click();
                }

                // Wait briefly, then check if the modal is open by seeing if the title is there
                await delay(900);
                const modalOpen = await page.evaluate(selector => !!document.querySelector(selector), modalTitleSelector);
                if (modalOpen) {
                  modalOpened = true;
                  break;
                }
              } catch (e) {
                // If an essential selector is missing, treat it as missing info
                if (
                  e.message.includes('ipc-title__text.prompt-title-text') ||
                  e.message.includes('ipc-promptable-base__content')
                ) {
                  console.log(`Essential modal info missing for "${item.movieName}". Marking as failed (missing) immediately.`);
                  skipImmediately = true;
                  break;
                }
                console.log(`Attempt ${attempts} failed to open modal for "${item.movieName}": ${e}`);
                await delay(1000);
              }
              console.log(`Retry attempt ${attempts} for "${item.movieName}"...`);
            }

            if (!modalOpened || skipImmediately) {
              console.log(`Failed to open modal for "${item.movieName}" after ${attempts} attempts.`);
              // Mark as failed
              failedMissingMap.set(item.movieName, item.movieLink);
              fs.writeFileSync(
                failedMissingFilePath,
                JSON.stringify([...failedMissingMap.entries()].map(([movie_name, link]) => ({ movie_name, link })), null, 2)
              );
              continue;
            }

            // Wait extra moment to ensure modal content is fully loaded
            await delay(600);

            // Extract data from the modal
            const modalData = await page.evaluate(() => {
              // Title
              const titleEl = document.querySelector('h3.ipc-title__text.prompt-title-text');
              const extractedModalName = titleEl ? titleEl.innerText.trim() : '';

              // Attempt to find the short synopsis
              let overview = '';
              const shortSynopsisEl = document.querySelector(
                '.ipc-promptable-base__content div.sc-315159d6-2.bnBRBp, ' +
                '.ipc-promptable-base__content div.sc-123db28-2.hcriPl, ' +
                '.ipc-promptable-base__content div.sc-a55e4ef-2.fcndfQ, ' +
                '.ipc-promptable-base__content div.sc-52e89ff1-2.fcndfQ'
              );
              if (shortSynopsisEl) {
                overview = shortSynopsisEl.innerText.trim();
              }

              // Directors or Creators
              let director_names = '';
              const directorEls = document.querySelectorAll(
                'div[data-testid="p_ct_dr"] a.ipc-link, div[data-testid="p_ct_cr"] a.ipc-link'
              );
              if (directorEls && directorEls.length > 0) {
                director_names = Array.from(directorEls).map(el => el.innerText.trim()).join(', ');
              }

              // Actors
              let actor_names = '';
              const actorContainer = document.querySelector('div[data-testid="p_ct_cst"]');
              if (actorContainer) {
                const actorEls = actorContainer.querySelectorAll('a.ipc-link');
                actor_names = Array.from(actorEls).map(el => el.innerText.trim()).join(', ');
              }

              // Genres
              let genres = '';
              const genresContainer = document.querySelector('ul[data-testid="btp_gl"]');
              if (genresContainer) {
                const genreEls = genresContainer.querySelectorAll('li.ipc-inline-list__item');
                genres = Array.from(genreEls).map(el => el.innerText.trim()).join(', ');
              }

              // Year
              let year = '';
              const metaList = document.querySelector('ul[data-testid="btp_ml"]');
              if (metaList) {
                const yearEl = metaList.querySelector('li.ipc-inline-list__item');
                if (yearEl) {
                  year = yearEl.innerText.trim();
                }
              }

              return { extractedModalName, overview, director_names, actor_names, genres, year };
            });

            if (!modalData.extractedModalName || !modalData.overview) {
              console.log(`Movie "${item.movieName}" is missing essential modal info (title or plot). Marking as failed (missing) and skipping.`);
              failedMissingMap.set(item.movieName, item.movieLink);
              fs.writeFileSync(
                failedMissingFilePath,
                JSON.stringify([...failedMissingMap.entries()].map(([movie_name, link]) => ({ movie_name, link })), null, 2)
              );
            } else {
              // If successful, add to visited
              const movieData = {
                movie_name: item.movieName,
                link: item.movieLink,
                overview: modalData.overview,
                director_names: modalData.director_names,
                actor_names: modalData.actor_names,
                genres: modalData.genres,
                year: modalData.year
              };
              visitedMovies.push(movieData);
              processedMap.set(movieData.movie_name, true);
              fs.writeFileSync(progressFilePath, JSON.stringify(visitedMovies, null, 2));

              console.log(`Saved movie: "${movieData.movie_name}" (Year: ${movieData.year})`);
              console.log(`Link: ${movieData.link}`);
              console.log(`Genres: ${movieData.genres}`);
              console.log(`Director(s): ${movieData.director_names}`);
              console.log(`Actor(s): ${movieData.actor_names}`);
              console.log(`Plot: ${movieData.overview}`);
            }

            // Close the modal by clicking outside of it
            try {
              const dimensions = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
              await page.mouse.click(dimensions.width - 10, 10);
              // Wait for the main modal container to disappear
              await page.waitForSelector('div[data-testid="promptable__pc"]', { hidden: true, timeout: 5000 });
              console.log("Modal closed by clicking outside.");
            } catch (err) {
              console.log(`Error closing modal by clicking outside for "${item.movieName}": ${err}`);
              try {
                const exitButton = await page.$('button[aria-label="Close Prompt"], button[aria-label="Close"]');
                if (exitButton) {
                  await page.evaluate(btn => btn.click(), exitButton);
                  await page.waitForSelector('div[data-testid="promptable__pc"]', { hidden: true, timeout: 5000 });
                } else {
                  console.log('Exit button not found, sending Escape key.');
                  await page.keyboard.press('Escape');
                  await delay(500);
                }
              } catch (err2) {
                console.log(`Fallback error closing modal for "${item.movieName}": ${err2}`);
                await page.evaluate(() => {
                  const modal = document.querySelector('div[data-testid="promptable__pc"]');
                  if (modal) modal.parentElement.removeChild(modal);
                });
                await delay(500);
              }
            }
            await delay(500);
          } // end for each movie in unprocessedMovies

          // Click the "50 more" button if available
          let moreButton = await page.$(moreButtonSelector);
          if (moreButton) {
            console.log("Clicking '50 more' button to load additional movies...");
            await moreButton.click();
            await delay(3000);
          } else {
            console.log("No '50 more' button found. Finished loading movies for this month.");
            break;
          }
        } // end while loop for current month's page
      } // end for each month
    } // end for each target year

    await browser.close();
    console.log('\nAll movies processed, writing CSV file...');

    // Generate CSV content
    const csvHeader = '"title","genres","director_names","actor_names","plot"\n';
    const escapeCsv = (str) => `"${str.replace(/"/g, '""')}"`;
    let csvContent = csvHeader;

    visitedMovies.forEach(movie => {
      csvContent += [
        escapeCsv(movie.movie_name),
        escapeCsv(movie.genres),
        escapeCsv(movie.director_names),
        escapeCsv(movie.actor_names),
        escapeCsv(movie.overview)
      ].join(",") + "\n";
    });

    fs.writeFileSync(csvFilePath, csvContent);
    console.log(`CSV file saved as ${csvFilePath}`);
  } catch (error) {
    console.error('Error:', error);
  }
})();
