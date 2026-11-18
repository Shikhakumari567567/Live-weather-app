# Weatherly — Live Weather Dashboard

A responsive weather dashboard built with HTML, CSS, and vanilla JavaScript. It uses `fetch` and `async`/`await` to look up a city and display current conditions plus a five-day forecast.

## Run locally

From this folder, start a local web server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser. The app uses the free Open-Meteo geocoding and forecast APIs and does not require an API key.

## Features

- Search cities with input validation, loading feedback, and clear error messages.
- View current temperature, apparent temperature, humidity, wind, and rain chance.
- Browse a five-day forecast with weather icons and high/low temperatures.
- Switch between Celsius and Fahrenheit without another API request.
- Responsive layout for desktop and mobile.
