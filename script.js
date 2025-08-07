// cache to store episodes for each show to avoid repeated API calls
const episodesCache = {};

// global variable to hold the currently displayed episodes
let currentEpisodes = [];
let allShows = null;

async function setup() {
  const root = document.getElementById("root");
  root.innerHTML = "TVMaze data is coming 🏃🏿";

  try {
    // fetch all the shows
   if (!allShows) {
  const response = await fetch("https://api.tvmaze.com/shows");
  if (!response.ok) throw new Error(`HTTP error! status:${response.status}`);
  allShows = await response.json();
  allShows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}


    // sort the shows in alphabetical order by name in place (it modifies the original array)
    allShows.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    // render all shows as cards
    renderCards(allShows, "show");

    // pass in label and value functions into populateDropdown to populate with shows
    populateDropdown(
      document.getElementById("showsDropdown"),
      allShows,
      // use the show name as the label
      (show) => show.name,
      // use the show ID as the value
      (show) => show.id,
      // add special option at the top of the dropdown before the list of shows
      [{ text: "Select a show", value: "", disabled: true, selected: true }]
    );
    document.getElementById("keywordInput").addEventListener("input", (event) => {
  const keyword = event.target.value.toLowerCase();
  const filteredShows = allShows.filter((show) => {
    const nameMatch = show.name.toLowerCase().includes(keyword);
    const summaryMatch = (show.summary || "").toLowerCase().includes(keyword);
    const genreMatch = show.genres.join(", ").toLowerCase().includes(keyword);
    return nameMatch || summaryMatch || genreMatch;
  });

  currentEpisodes = []; // clear episodes if you're searching shows
  renderCards(filteredShows, "show");

  document.getElementById("episodeCount").textContent = `Found ${filteredShows.length} shows`;
});

  } catch (error) {
    root.innerHTML = "Failed to load TVMaze data. Please try again later.";
    console.error("Error fetching shows:", error);
  }
}

// fetch and display episodes when a show is selected from the dropdown
document
  .getElementById("showsDropdown")
  .addEventListener("change", async (event) => {
    const showID = event.target.value;
    if (!showID) return; // If no show is selected, do nothing

    // check the cache for episodes of the selected show
    let allEpisodes;

    // if the episodes for the selected show are already cached, use them
    if (episodesCache[showID]) {
      allEpisodes = episodesCache[showID];
    } else {
      // otherwise, fetch the episodes for the selected show
      const episodesResponse = await fetch(
        `https://api.tvmaze.com/shows/${showID}/episodes`
      );
      // if the response is not ok, throw an error
      if (!episodesResponse.ok)
        throw new Error(`HTTP error! status:${episodesResponse.status}`);
      // parse the JSON data
      allEpisodes = await episodesResponse.json();
      // sort the episodes in order of season and episode number
      allEpisodes.sort((a, b) => {
        const seasonDiff = a.season - b.season;
        return seasonDiff !== 0 ? seasonDiff : a.number - b.number;
      });
      episodesCache[showID] = allEpisodes; // Store in cache
    }

    // update the global variable
    currentEpisodes = allEpisodes;

    // Reset search and count
    document.getElementById("keywordInput").value = "";
    document.getElementById("episodeCount").textContent =
      "Showing all episodes";

    // render the episodes for the selected show
    renderCards(allEpisodes, "episode");

    // populate the dropdown with the episodes list
    populateDropdown(
      document.getElementById("episodeDropdown"),
      allEpisodes,
      // use the function to get the label
      (ep) => getEpisodeLabel(ep),
      // use a unique identifier to access the episode
      (ep) => ep.id,
      [
        // add special options at the top of the dropdown before the list of episodes
        {
          text: "Select an episode",
          value: "",
          disabled: true,
          selected: true,
        },
        { text: "All Episodes", value: "" },
      ]
    );
 
        document.getElementById("backToShowsBtn").style.display = "inline";

  });

// add an event listener for when the episode dropdown selection changes
document
  .getElementById("episodeDropdown")
  .addEventListener("change", (event) => {
    handleDropdownOption(event, currentEpisodes);
  });

// helper function to pad numbers with leading zeros
function zeroPad(num) {
  return num.toString().padStart(2, "0");
}

// helper function for formatting the season/episode code
function seasonEpisodeCode(ep) {
  return `S${zeroPad(ep.season)}E${zeroPad(ep.number)}`;
}

// helper function to get the full episode label with name and season/episode code
function getEpisodeLabel(ep) {
  const episodeCode = seasonEpisodeCode(ep);
  return `${ep.name} - ${episodeCode}`;
}

// helper function to create option elements
function createOptionElement(opt) {
  const option = document.createElement("option");
  option.textContent = opt.text;
  option.value = opt.value;
  if (opt.disabled) option.disabled = true;
  if (opt.selected) option.selected = true;
  return option;
}

// function to populate a dropdown with options (including extra "default" options via a new array parameter)
function populateDropdown(
  dropdown,
  data,
  getLabel,
  getValue,
  extraOptions = []
) {
  // clear existing options
  dropdown.innerHTML = "";

  // Add an extra option to the dropdown first
  extraOptions.forEach((opt) => {
    dropdown.appendChild(createOptionElement(opt));
  });
  // add the data to the option element
  data.forEach((item) => {
    dropdown.appendChild(
      createOptionElement({
        text: getLabel(item),
        value: getValue(item),
      })
    );
  });
}

function handleDropdownOption(event, episodes) {
  const selectedValue = event.target.value;

  if (selectedValue === "default") {
    return;
  } else if (selectedValue === "") {
    // if the "All Episodes" option is selected, show all episodes
    renderCards(episodes, "episode");
    document.getElementById("episodeCount").textContent =
      "Showing all episodes";
  } else {
    // find the selected episode by its unique identifier value (either the ID or the URL)
    const selectedEpisode = episodes.find(
      (ep) => ep.id.toString() === selectedValue
    );
    renderCards([selectedEpisode], "episode");
    document.getElementById("episodeCount").textContent = ``;
  }
}

function renderCards(dataArray, type) {
  const root = document.getElementById("root");
  root.innerHTML = ""; // Clear previous content
  const template = document.getElementById(
    // if the type is "show", use the show template, otherwise use the episode template
    type === "show" ? "showTemplate" : "episodeTemplate"
  );

  // loop through the rendered data array and create a clone of the template for each item
  dataArray.forEach((item) => {
    const clone = template.content.cloneNode(true);
    const anchor = clone.querySelector("a");
    const img = clone.querySelector("img");

    anchor.href = item.url;

    // handle image for shows/episodes
    if (item.image && item.image.medium) {
      img.src = item.image?.medium || "https://via.placeholder.com/210x295?text=No+Image";
      img.alt = item.name ? `Image from ${item.name}` : "No image available";
    } else {
      img.src = "";
      img.alt = "No image available";
    }

    if (type === "show") {
      clone.querySelector(".show-name").textContent = item.name;
          const summaryHTML = `
            <p><strong>Genres:</strong> ${item.genres.join(", ")}</p>
            <p><strong>Status:</strong> ${item.status}</p>
            <p><strong>Rating:</strong> ${item.rating.average ?? "N/A"}</p>
            <p><strong>Runtime:</strong> ${item.runtime} min</p>
            ${item.summary || ""}
          `;

      clone.querySelector(".show-summary").innerHTML = summaryHTML;
      // Add more show fields if needed (genres, status, rating, runtime)
      anchor.addEventListener("click", async (e) => {
  e.preventDefault();
  await loadEpisodesForShow(item.id); // new helper you'll create
});

    } else {
      clone.querySelector(".episode-name-and-code").textContent =
        getEpisodeLabel(item);
      clone.querySelector(".episode-summary").innerHTML = item.summary;
    }

    root.appendChild(clone);
  });
}

// add event listener to the keyword search box
document.getElementById("keywordInput").addEventListener("input", () => {
  const input = document.getElementById("keywordInput");
  const episodeCount = document.getElementById("episodeCount");
  // get the value of the input and convert to lowercase
  const keywordSearch = input.value.toLowerCase();

  // filter the episodes based on the match to the search keyword (by episode name and summary)
  const filteredEpisodes = currentEpisodes.filter((ep) => {
    const nameMatch = ep.name.toLowerCase().includes(keywordSearch);
    const summaryMatch = ep.summary.toLowerCase().includes(keywordSearch);
    return nameMatch || summaryMatch;
  });

  // update the display ( pass in the filtered episodes and specify the type as "episode" )
  renderCards(filteredEpisodes, "episode");

  // update the count display to match the no. of returned episodes
  episodeCount.textContent = `Displaying ${filteredEpisodes.length} of ${currentEpisodes.length} episodes`;

  if (keywordSearch === "") {
    document.getElementById("episodeDropdown").value = "";
    episodeCount.textContent = "Showing all episodes";
    renderCards(currentEpisodes, "episode");
  }
});
document.getElementById("backToShowsBtn").addEventListener("click", () => {
  document.getElementById("showsDropdown").value = "";
  document.getElementById("episodeDropdown").innerHTML = "";
  document.getElementById("keywordInput").value = "";
  document.getElementById("episodeCount").textContent = "";
  currentEpisodes = [];
  renderCards(Object.values(episodesCache).length ? Object.values(episodesCache).flat() : [], "show");
  document.getElementById("backToShowsBtn").style.display = "none";
});

document.getElementById("backToShowsBtn").addEventListener("click", () => {
  document.getElementById("showsDropdown").value = "";
  document.getElementById("episodeDropdown").innerHTML = "";
  document.getElementById("keywordInput").value = "";
  document.getElementById("episodeCount").textContent = "";
  currentEpisodes = [];

 
  setup(); 
  document.getElementById("backToShowsBtn").style.display = "none";
});

async function loadEpisodesForShow(showID) {
  const episodesDropdown = document.getElementById("episodeDropdown");
  const backBtn = document.getElementById("backToShowsBtn");

  let allEpisodes;

  if (episodesCache[showID]) {
    allEpisodes = episodesCache[showID];
  } else {
    const episodesResponse = await fetch(
      `https://api.tvmaze.com/shows/${showID}/episodes`
    );
    if (!episodesResponse.ok)
      throw new Error(`HTTP error! status:${episodesResponse.status}`);
    allEpisodes = await episodesResponse.json();
    allEpisodes.sort((a, b) => a.season - b.season || a.number - b.number);
    episodesCache[showID] = allEpisodes;
  }

  currentEpisodes = allEpisodes;

  document.getElementById("showsDropdown").value = showID;
  document.getElementById("episodeCount").textContent = "Showing all episodes";
  document.getElementById("keywordInput").value = "";
  renderCards(allEpisodes, "episode");

  populateDropdown(
    episodesDropdown,
    allEpisodes,
    getEpisodeLabel,
    (ep) => ep.id,
    [
      { text: "Select an episode", value: "", disabled: true, selected: true },
      { text: "All Episodes", value: "" },
    ]
  );

  backBtn.style.display = "inline";
}



window.onload = setup;
