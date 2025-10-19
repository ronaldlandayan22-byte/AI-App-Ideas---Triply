/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from '@google/genai';

// --- UI Elements ---

const STAR_ICON_SVG = `
  <svg class="star-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
  </svg>
`;

// Logo
const logo = document.createElement('div');
logo.className = 'logo';
logo.innerHTML = `
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 12H22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21.95 12C21.95 12 20.65 6.8 16.8 4.7C12.95 2.6 7.95 4.1 5.4 7.5C2.85 10.9 4.1 16.35 7.95 18.45C11.8 20.55 17.3 18.7 19.35 15.35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M19.35 15.35L17.85 17.6L15.3 16.85L16.1 14.3L19.35 15.35Z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
  </svg>
  <span>Triply</span>
`;
document.body.prepend(logo);

// Page 1: Home/Form Page
const main = document.createElement('main');

const form = document.createElement('form');
form.setAttribute('aria-label', 'Travel itinerary planner form');

const inputGroup = document.createElement('div');
inputGroup.className = 'input-group';

const destinationInput = document.createElement('input');
destinationInput.type = 'text';
destinationInput.placeholder = 'Destination (e.g., Rome)';
destinationInput.setAttribute('aria-label', 'Travel destination');
destinationInput.setAttribute('list', 'popular-destinations');
destinationInput.required = true;

const popularDestinations = [
  'Tokyo, Japan',
  'Paris, France',
  'Rome, Italy',
  'London, UK',
  'New York City, USA',
  'Bali, Indonesia',
  'Sydney, Australia',
  'Cairo, Egypt',
  'Rio de Janeiro, Brazil',
  'Kyoto, Japan',
  'Barcelona, Spain',
  'Dubai, UAE',
  'Machu Picchu, Peru',
  'Santorini, Greece',
  'Maui, Hawaii, USA',
];

const destinationDatalist = document.createElement('datalist');
destinationDatalist.id = 'popular-destinations';
popularDestinations.forEach((city) => {
  const option = document.createElement('option');
  option.value = city;
  destinationDatalist.append(option);
});

const arrivalDateInput = document.createElement('input');
arrivalDateInput.type = 'date';
arrivalDateInput.setAttribute('aria-label', 'Arrival date');
arrivalDateInput.required = true;

const departureDateInput = document.createElement('input');
departureDateInput.type = 'date';
departureDateInput.setAttribute('aria-label', 'Departure date');
departureDateInput.required = true;

// Set min dates to prevent past selections and invalid ranges
const today = new Date().toISOString().split('T')[0];
arrivalDateInput.min = today;
departureDateInput.min = today;

arrivalDateInput.addEventListener('change', () => {
  if (arrivalDateInput.value) {
    const nextDay = new Date(arrivalDateInput.value);
    nextDay.setDate(nextDay.getDate() + 1);
    const minDepartureDate = nextDay.toISOString().split('T')[0];
    departureDateInput.min = minDepartureDate;

    // If current departure is before new arrival min, clear it
    if (departureDateInput.value < departureDateInput.min) {
      departureDateInput.value = '';
    }
  }
});

const button = document.createElement('button');
button.type = 'submit';
button.textContent = 'Generate Itinerary';

const loader = document.createElement('div');
loader.className = 'loader';

const errorDisplay = document.createElement('div');
errorDisplay.className = 'error-display';
errorDisplay.style.display = 'none';

inputGroup.append(destinationInput, arrivalDateInput, departureDateInput);
form.append(inputGroup, button, destinationDatalist);
main.append(form, loader, errorDisplay);

// Page 2: Itinerary Results Page
const itineraryPage = document.createElement('div');
itineraryPage.id = 'itinerary-page';
itineraryPage.style.display = 'none'; // Hide initially

document.body.append(main, itineraryPage);


// --- App Logic ---
let currentItineraryData = null; // Store the current itinerary data

// Add click listener to logo for navigation
logo.addEventListener('click', () => {
  // Only act as a home button if we are on the itinerary page
  if (itineraryPage.style.display === 'block') {
    itineraryPage.style.display = 'none';
    main.style.display = 'flex';
    // Restore flexbox to body for centering main page
    document.body.style.display = 'flex';
    document.body.style.justifyContent = 'center';
    document.body.style.alignItems = 'flex-start';
    itineraryPage.innerHTML = '';
    form.reset();
  }
});

let ai;
try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (error) {
  console.error(error);
  errorDisplay.textContent =
    'Failed to initialize AI. Make sure you have set your API_KEY.';
  errorDisplay.style.display = 'block';
}

const updateBackground = (destination) => {
  if (!destination) return;

  // Extract the primary location name for a cleaner query.
  const query = destination.split(',')[0].trim();
  // Use Unsplash Source with specific keywords for better, more reliable results.
  const imageUrl = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(
    query
  )},travel`;

  const img = new Image();
  img.src = imageUrl;
  img.onload = () => {
    document.documentElement.style.backgroundImage = `url('${imageUrl}')`;
  };
  img.onerror = () => {
    console.error(`Failed to load background image for destination: ${destination}`);
  };
};

destinationInput.addEventListener('change', () => {
  updateBackground(destinationInput.value);
});

/**
 * Parses a duration string (e.g., "2 hours", "30 minutes") into total minutes.
 * @param {string} durationStr - The duration string.
 * @returns {number} The total duration in minutes.
 */
const parseDurationToMinutes = (durationStr) => {
  if (!durationStr) return 0;

  const hoursMatch = durationStr.match(/(\d+\.?\d*)\s*hour/i);
  const minutesMatch = durationStr.match(/(\d+)\s*min/i);

  let totalMinutes = 0;
  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60;
  }
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }

  return totalMinutes;
};


const generateItinerary = async (e) => {
  e.preventDefault();
  const destination = destinationInput.value.trim();
  const arrival = arrivalDateInput.value;
  const departure = departureDateInput.value;

  if (!destination || !arrival || !departure || !ai) {
    return;
  }

  updateBackground(destination);

  const arrivalDate = new Date(arrival);
  const departureDate = new Date(departure);
  const timeDiff = departureDate.getTime() - arrivalDate.getTime();
  const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

  if (days <= 0) {
    errorDisplay.textContent = 'Departure date must be after the arrival date.';
    errorDisplay.style.display = 'block';
    return;
  }

  // Set loading state
  button.disabled = true;
  button.textContent = 'Generating...';
  loader.style.display = 'block';
  errorDisplay.style.display = 'none';
  itineraryPage.innerHTML = '';

  const diningSchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'The specific name of the restaurant.' },
      description: { type: Type.STRING, description: 'A brief, one-sentence description of the restaurant (e.g., "Authentic Roman pasta dishes").' },
      rating: { type: Type.STRING, description: 'The Google Reviews rating (e.g., "4.5 stars").' },
    },
    required: ['name', 'description', 'rating'],
  };

  const activitySchema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'The specific name of the establishment or landmark.' },
      description: { type: Type.STRING, description: 'A brief description of the activity.' },
      duration: { type: Type.STRING, description: 'Approximate duration (e.g., "2 hours", "30 mins").' },
      rating: { type: Type.STRING, description: 'The Google Reviews rating (e.g., "4.7 stars").' },
    },
    required: ['name', 'description', 'duration', 'rating'],
  };

  const itinerarySchema = {
    type: Type.ARRAY,
    description: 'A list of daily itinerary plans.',
    items: {
      type: Type.OBJECT,
      properties: {
        day: { type: Type.NUMBER },
        date: { type: Type.STRING },
        morning: { type: Type.ARRAY, description: 'List of morning activities.', items: activitySchema },
        afternoon: { type: Type.ARRAY, description: 'List of afternoon activities.', items: activitySchema },
        evening: { type: Type.ARRAY, description: 'List of evening activities.', items: activitySchema },
        dining: { type: Type.ARRAY, description: 'Dining suggestions for the entire day.', items: diningSchema },
      },
    },
  };

  const prompt = `Create a detailed travel itinerary for a ${days}-day trip to ${destination}, starting on ${arrival} and ending on ${departure}.
For each activity and dining suggestion, provide the specific name of the business or establishment, a brief description (e.g., "Explore ancient ruins" or "Cozy spot for traditional pasta"), and its Google Review rating (e.g., "4.7 stars").
For each activity, provide suggestions for "morning", "afternoon", and "evening". Each activity must include a description and an approximate duration in hours or minutes (e.g., "2 hours", "30 mins").
Also provide a list of "dining" suggestions for the day.
Respond with a JSON object that adheres to the provided schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: itinerarySchema,
      },
    });

    currentItineraryData = JSON.parse(response.text);
    renderItinerary(currentItineraryData);
    // Switch to the itinerary page
    main.style.display = 'none';
    itineraryPage.style.display = 'block';
    // Use block layout for body to allow natural content height
    document.body.style.display = 'block';
    document.body.style.justifyContent = '';
    document.body.style.alignItems = '';

  } catch (error) {
    console.error(error);
    errorDisplay.textContent = 'An error occurred while generating the itinerary. Please try again.';
    errorDisplay.style.display = 'block';
  } finally {
    // Reset state
    button.disabled = false;
    button.textContent = 'Generate Itinerary';
    loader.style.display = 'none';
  }
};

const renderItinerary = (itineraryData, checkedIds = new Set()) => {
  itineraryPage.innerHTML = ''; // Clear previous content

  if (!itineraryData || itineraryData.length === 0) {
    const noResults = document.createElement('p');
    noResults.textContent = 'No itinerary could be generated.';
    itineraryPage.append(noResults);
    return;
  }

  // Wrapper for content to have padding and max-width
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'itinerary-content';

  const rerollButtonTop = document.createElement('button');
  rerollButtonTop.textContent = 'Reroll Unchecked Activities';
  rerollButtonTop.className = 'reroll-btn';
  rerollButtonTop.onclick = handleReroll;
  contentWrapper.append(rerollButtonTop);

  itineraryData.forEach((dayPlan, dayIndex) => {
    const dayArticle = document.createElement('article');
    dayArticle.className = 'day-itinerary';

    const dayHeader = document.createElement('h2');
    const formattedDate = new Date(dayPlan.date).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC', // Ensure date is not shifted
    });
    dayHeader.textContent = `Day ${dayPlan.day}: ${formattedDate}`;
    dayArticle.append(dayHeader);

    const timeContext = {
      time: new Date(`${dayPlan.date}T10:00:00Z`),
    };

    if (dayPlan.morning?.length) {
      dayArticle.append(createCategorySection('Morning', dayPlan.morning, true, timeContext, dayIndex, checkedIds));
    }
    if (dayPlan.afternoon?.length) {
      dayArticle.append(createCategorySection('Afternoon', dayPlan.afternoon, true, timeContext, dayIndex, checkedIds));
    }
    if (dayPlan.evening?.length) {
      dayArticle.append(createCategorySection('Evening', dayPlan.evening, true, timeContext, dayIndex, checkedIds));
    }
    if (dayPlan.dining?.length) {
      dayArticle.append(createCategorySection('Dining', dayPlan.dining, false, null, dayIndex, checkedIds));
    }

    contentWrapper.append(dayArticle);
  });
  
  const rerollButtonBottom = document.createElement('button');
  rerollButtonBottom.textContent = 'Reroll Unchecked Activities';
  rerollButtonBottom.className = 'reroll-btn';
  rerollButtonBottom.onclick = handleReroll;
  contentWrapper.append(rerollButtonBottom);

  itineraryPage.append(contentWrapper);
};

const createCategorySection = (title, items, isActivity, timeContext, dayIndex, checkedIds) => {
  const section = document.createElement('section');
  section.className = 'category-section';

  const header = document.createElement('h3');
  header.textContent = title;
  section.append(header);

  const list = document.createElement('ul');
  items.forEach((item, itemIndex) => {
    const listItem = document.createElement('li');
    const category = title.toLowerCase();
    const itemId = `${dayIndex}-${category}-${itemIndex}`;
    
    // Add data attributes for rerolling
    listItem.dataset.dayIndex = String(dayIndex);
    listItem.dataset.category = category;
    listItem.dataset.itemIndex = String(itemIndex);

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = itemId;
    checkbox.checked = checkedIds.has(itemId);
    
    const contentContainer = document.createElement('div');
    contentContainer.className = 'activity-content';
    
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'activity-details';

    const link = document.createElement('a');
    const mapsQuery = encodeURIComponent(`${item.name}, ${destinationInput.value}`);
    link.href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    link.textContent = item.name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'activity-link';

    const ratingSpan = document.createElement('span');
    ratingSpan.className = 'rating-info';
    ratingSpan.innerHTML = `${STAR_ICON_SVG} ${item.rating || ''}`;
    
    detailsContainer.append(link, ratingSpan);
    
    if (isActivity) {
      const durationSpan = document.createElement('span');
      durationSpan.className = 'duration';
      durationSpan.textContent = `(${item.duration})`;
      detailsContainer.append(durationSpan);
    }

    contentContainer.append(detailsContainer);

    if (item.description) {
      const descriptionP = document.createElement('p');
      descriptionP.className = 'activity-description';
      descriptionP.textContent = item.description;
      contentContainer.append(descriptionP);
    }
    
    label.append(checkbox, contentContainer);
    listItem.append(label);

    if (isActivity && timeContext) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'activity-time';
      timeSpan.textContent = timeContext.time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      });
      listItem.append(timeSpan);

      const durationInMinutes = parseDurationToMinutes(item.duration);
      timeContext.time.setUTCMinutes(timeContext.time.getUTCMinutes() + durationInMinutes);
    }

    list.append(listItem);
  });
  section.append(list);
  return section;
};

const handleReroll = async () => {
    const rerollButtons = document.querySelectorAll('.reroll-btn');
    rerollButtons.forEach(btn => {
        (btn as HTMLButtonElement).disabled = true;
        (btn as HTMLButtonElement).textContent = 'Rerolling...';
    });

    const likedActivities = [];
    const activitiesToReroll = [];
    const checkedIds = new Set();
    const destination = destinationInput.value.trim();

    document.querySelectorAll('#itinerary-page li').forEach(li => {
        const checkbox = li.querySelector('input[type="checkbox"]');
        if (!checkbox) return;

        const { dayIndex, category, itemIndex } = (li as HTMLElement).dataset;
        const isDining = category === 'dining';
        const dayIdx = parseInt(dayIndex, 10);
        const itemIdx = parseInt(itemIndex, 10);
        const activity = currentItineraryData[dayIdx][category][itemIdx];
        
        if ((checkbox as HTMLInputElement).checked) {
            checkedIds.add(checkbox.id);
            if (!isDining) {
                likedActivities.push(activity.name);
            }
        } else if (!isDining) {
            activitiesToReroll.push({ dayIndex: dayIdx, category, itemIndex: itemIdx });
        }
    });

    if (activitiesToReroll.length === 0) {
        alert("Please uncheck some activities to reroll!");
        rerollButtons.forEach(btn => {
            (btn as HTMLButtonElement).disabled = false;
            (btn as HTMLButtonElement).textContent = 'Reroll Unchecked Activities';
        });
        return;
    }
    
    const newSuggestionsSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                duration: { type: Type.STRING },
                rating: { type: Type.STRING },
            },
            required: ['name', 'description', 'duration', 'rating'],
        },
    };

    const prompt = `I am planning a trip to ${destination}.
Based on these activities I like: ${likedActivities.join(', ') || 'general tourist activities'}.
Please generate ${activitiesToReroll.length} new activity suggestions to replace some I'm not interested in. For each, provide the specific name, a brief description, a duration, and its Google Review rating.
The new suggestions should be similar in style to my preferred activities.
Respond ONLY with a JSON array of the new suggestions, matching the provided schema. Do not include any other text.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: newSuggestionsSchema,
            },
        });

        const newActivities = JSON.parse(response.text);

        if (newActivities.length < activitiesToReroll.length) {
            throw new Error("API returned fewer activities than requested.");
        }
        
        activitiesToReroll.forEach((itemToReplace, i) => {
            const { dayIndex, category, itemIndex } = itemToReplace;
            currentItineraryData[dayIndex][category][itemIndex] = newActivities[i];
        });

        renderItinerary(currentItineraryData, checkedIds);

    } catch (error) {
        console.error("Reroll failed:", error);
        alert("An error occurred while rerolling. Please try again.");
    } finally {
         const newRerollButtons = document.querySelectorAll('.reroll-btn');
         newRerollButtons.forEach(btn => {
             (btn as HTMLButtonElement).disabled = false;
             (btn as HTMLButtonElement).textContent = 'Reroll Unchecked Activities';
         });
    }
};


form.addEventListener('submit', generateItinerary);