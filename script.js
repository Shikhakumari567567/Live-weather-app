const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_DAYS = 5;

const form = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const searchMessage = document.querySelector("#search-message");
const weatherContent = document.querySelector("#weather-content");
const emptyState = document.querySelector("#empty-state");
const forecastGrid = document.querySelector("#forecast-grid");
const unitToggle = document.querySelector("#unit-toggle");

let activeUnit = "celsius";
let latestWeather = null;
let latestLocation = null;

const weatherTypes = {
  0: { label: "Clear sky", icon: "☀️", nightIcon: "🌙" },
  1: { label: "Mainly clear", icon: "🌤️", nightIcon: "🌙" },
  2: { label: "Partly cloudy", icon: "⛅", nightIcon: "☁️" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  56: { label: "Light freezing drizzle", icon: "🌧️" },
  57: { label: "Freezing drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌦️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Light freezing rain", icon: "🌧️" },
  67: { label: "Freezing rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "🌨️" },
  80: { label: "Light rain showers", icon: "🌦️" },
  81: { label: "Rain showers", icon: "🌧️" },
  82: { label: "Heavy rain showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Heavy thunderstorm with hail", icon: "⛈️" },
};

function getWeatherType(code, isDay = true) {
  const weather = weatherTypes[code] ?? { label: "Unknown conditions", icon: "🌡️" };
  return {
    label: weather.label,
    icon: !isDay && weather.nightIcon ? weather.nightIcon : weather.icon,
  };
}

function formatTemperature(celsius) {
  const temperature = activeUnit === "fahrenheit"
    ? (celsius * 9) / 5 + 32
    : celsius;
  return `${Math.round(temperature)}°`;
}

function setMessage(message, type = "") {
  searchMessage.textContent = message;
  searchMessage.className = `search-hint${type ? ` is-${type}` : ""}`;
}

function setLoading(isLoading) {
  form.classList.toggle("is-loading", isLoading);
  searchButton.disabled = isLoading;
  cityInput.disabled = isLoading;
  weatherContent.setAttribute("aria-busy", String(isLoading));
}

function formatLocationName(location) {
  const parts = [location.name, location.admin1, location.country].filter(Boolean);
  return [...new Set(parts)].join(", ");
}

function formatLocalTime(time, timezone) {
  if (!time || !timezone) {
    return "";
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date());
}

function formatForecastDay(dateString, index) {
  if (index === 0) {
    return "Today";
  }
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
}

function renderCurrentWeather(weather, location) {
  const current = weather.current;
  const currentType = getWeatherType(current.weather_code, current.is_day === 1);
  const dailyRainChance = weather.daily.precipitation_probability_max?.[0];
  const feelsLike = formatTemperature(current.apparent_temperature);
  const rain = Number.isFinite(dailyRainChance) ? `${dailyRainChance}%` : "—";

  document.querySelector("#location-name").textContent = formatLocationName(location);
  document.querySelector("#local-time").textContent = formatLocalTime(current.time, weather.timezone);
  document.querySelector("#current-icon").textContent = currentType.icon;
  document.querySelector("#current-temperature-value").textContent =
    String(Math.round(activeUnit === "fahrenheit" ? (current.temperature_2m * 9) / 5 + 32 : current.temperature_2m));
  document.querySelector("#current-condition").textContent = currentType.label;
  document.querySelector("#feels-like").textContent = `Feels like ${feelsLike}`;
  document.querySelector("#humidity").textContent = `${current.relative_humidity_2m}%`;
  document.querySelector("#wind-speed").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  document.querySelector("#rain-chance").textContent = rain;
}

function renderForecast(weather) {
  const daily = weather.daily;
  forecastGrid.replaceChildren();

  daily.time.slice(0, FORECAST_DAYS).forEach((date, index) => {
    const type = getWeatherType(daily.weather_code[index]);
    const card = document.createElement("article");
    card.className = "forecast-card";
    card.setAttribute("aria-label", `${formatForecastDay(date, index)}: ${type.label}`);

    const day = document.createElement("span");
    day.className = "forecast-day";
    day.textContent = formatForecastDay(date, index);

    const icon = document.createElement("span");
    icon.className = "forecast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = type.icon;

    const condition = document.createElement("span");
    condition.className = "forecast-condition";
    condition.textContent = type.label;

    const temperatures = document.createElement("span");
    temperatures.className = "forecast-temperatures";

    const high = document.createElement("span");
    high.className = "forecast-high";
    high.textContent = formatTemperature(daily.temperature_2m_max[index]);

    const low = document.createElement("span");
    low.className = "forecast-low";
    low.textContent = formatTemperature(daily.temperature_2m_min[index]);

    temperatures.append(high, low);
    card.append(day, icon, condition, temperatures);
    forecastGrid.append(card);
  });
}

function renderWeather(weather, location) {
  renderCurrentWeather(weather, location);
  renderForecast(weather);
  weatherContent.hidden = false;
  emptyState.hidden = true;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather service returned ${response.status}. Please try again.`);
  }
  return response.json();
}

async function searchCity(city) {
  const geocodingUrl = new URL(GEOCODING_BASE);
  geocodingUrl.search = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json",
  });

  const geocoding = await fetchJson(geocodingUrl);
  const location = geocoding.results?.[0];
  if (!location) {
    throw new Error(`We couldn’t find “${city}”. Check the spelling and try again.`);
  }

  const forecastUrl = new URL(API_BASE);
  forecastUrl.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS),
  });

  const weather = await fetchJson(forecastUrl);
  return { weather, location };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();

  if (!city) {
    setMessage("Please enter a city name to search.", "error");
    cityInput.focus();
    return;
  }
  if (!/[\p{L}\p{M}]/u.test(city)) {
    setMessage("Enter a city name using letters, such as Lisbon.", "error");
    cityInput.focus();
    return;
  }

  setLoading(true);
  setMessage(`Looking up ${city}…`);
  try {
    const result = await searchCity(city);
    latestWeather = result.weather;
    latestLocation = result.location;
    renderWeather(latestWeather, latestLocation);
    setMessage(`Showing live weather for ${formatLocationName(latestLocation)}.`, "success");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.", "error");
  } finally {
    setLoading(false);
  }
});

unitToggle.addEventListener("click", () => {
  activeUnit = activeUnit === "celsius" ? "fahrenheit" : "celsius";
  unitToggle.querySelector('[data-unit="celsius"]').classList.toggle("is-active", activeUnit === "celsius");
  unitToggle.querySelector('[data-unit="fahrenheit"]').classList.toggle("is-active", activeUnit === "fahrenheit");
  unitToggle.setAttribute(
    "aria-label",
    activeUnit === "celsius" ? "Switch to Fahrenheit" : "Switch to Celsius",
  );
  if (latestWeather && latestLocation) {
    renderWeather(latestWeather, latestLocation);
  }
});
