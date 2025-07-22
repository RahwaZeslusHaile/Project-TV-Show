async function setup() {
  const root = document.getElementById("root")
  const loadingMessage = document.createElement("p")
  loadingMessage.textContent = "Episodes are coming 🏃🏿"
  root.append(loadingMessage);
  try{
    const response = await fetch("https://api.tvmaze.com/shows/82/episodes")
    if(!response){
      throw new Error(`HTTP error! status:${response.status}`)
    }
    const allEpisodes = await response.json();
    root.innerHTML = "";
    populateDropdown(allEpisodes)
    makePageForEpisodes(allEpisodes)
 
  // add event listener for dropdown selection to filter episodes when the event 'change' is triggered
  const dropdown = document.getElementById("episodeDropdown");
  dropdown.addEventListener("change", (event) => {
    handleDropdownOption(event, allEpisodes);
  });

  // initialise the live search
  liveEpisodeSearch(allEpisodes);
}catch(error){
  root.innerHTML = "";
  const errorMessage = document.createElement("p");
  errorMessage.textContent = "Failed to load episodes. please try again later";
  errorMessage.style.backgroundColor = "red"
  root.appendChild(errorMessage)
} 
}

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

function populateDropdown(episodes) {
  const dropdown = document.getElementById("episodeDropdown");
  const template = document.getElementById("dropdownOptionTemplate");

  // add the "default" placeholder option to the dropdown list
  const defaultOption = document.createElement("option");
  defaultOption.textContent = "All Episodes";
  defaultOption.value = ""; // empty value for the default option
  defaultOption.disabled = true; // make it unselectable
  defaultOption.selected = true; // make it the default selected option
  dropdown.appendChild(defaultOption);

  // populate the dropdown list with all the episodes
  episodes.forEach((ep) => {
    const clone = template.content.cloneNode(true);
    const option = clone.querySelector("option");
    option.textContent = getEpisodeLabel(ep); // use the function to get the label
    option.value = ep.id || ep.url; // use a unique identifier to access the episode
    dropdown.appendChild(option);
  });
}

function handleDropdownOption(event, episodes) {
  const selectedValue = event.target.value;

  if (selectedValue === "") {
    // If the default option is selected, show all episodes
    makePageForEpisodes(episodes);
  } else {
    // Find the selected episode by its unique identifier value (either the ID or the URL)
    const selectedEpisode = episodes.find(
      (ep) => ep.id.toString() === selectedValue || ep.url === selectedValue
    );
    makePageForEpisodes([selectedEpisode]);
  }
}

function liveEpisodeSearch(episodes) {
  const input = document.getElementById("keywordInput");
  const episodeCount = document.getElementById("episodeCount");

  // add event listener to the search box
  input.addEventListener("input", () => {
    // get the value of the input and convert to lowercase
    const keywordSearch = input.value.toLowerCase();

    // filter the episodes based on the match to the search keyword (by episode name and summary)
    const filteredEpisodes = episodes.filter((ep) => {
      const nameMatch = ep.name.toLowerCase().includes(keywordSearch);
      const summaryMatch = ep.summary.toLowerCase().includes(keywordSearch);
      return nameMatch || summaryMatch;
    });

    // update the display with the filtered episode
    makePageForEpisodes(filteredEpisodes);

    // update the count display to match the no. of returned episodes
    episodeCount.textContent = `Displaying ${filteredEpisodes.length} of ${episodes.length} episodes`;
  });
}

function makePageForEpisodes(episodes) {
  const root = document.getElementById("root");
  root.innerHTML = "";

  const template = document.getElementById("episodeTemplate");

  episodes.forEach((ep) => {
    const clone = template.content.cloneNode(true);

    clone.querySelector("a").href = ep.url;
    clone.querySelector(".episode-name-and-code").textContent =
      getEpisodeLabel(ep);

    const img = clone.querySelector("img");
    img.src = ep.image.medium;
    img.alt = `Image from ${ep.name}`;

    clone.querySelector(".episode-summary").innerHTML = ep.summary;

    root.appendChild(clone);
  });
}

window.onload = setup;
