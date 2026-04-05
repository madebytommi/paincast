# VaporCast 🌩️

**VaporCast** is a modern weather companion with a retro-futuristic dashboard style. It turns complex weather data into clear, actionable insights for everyday planning.

By combining current conditions, hourly trends, weekly forecasts, and practical weather insights, VaporCast helps you plan your day with confidence.

## 🚀 What It Does

- **Current Conditions:** Displays temperature, condition, and feels-like details at a glance.
- **Weather Insights:** Highlights UV index, air quality, dew point, and sunrise/sunset in a clean summary card.
- **Hourly Forecast:** Visualizes next-24-hour temperatures with condition details in an interactive chart.
- **7-Day Forecast:** Provides a week-long outlook so you can plan your schedule around incoming weather systems.
- **Location Detection:** Automatically acquires your location via your browser or allows manual location entry using OpenStreetMap geocoding.

## 🛠️ Technologies Used

VaporCast is built entirely as a static, client-side application requiring no backend or build process:

- **HTML5 & CSS3**
- **Vanilla JavaScript**
- **[Bootstrap 5.3](https://getbootstrap.com/)**: For responsive layout and utility classes.
- **[Chart.js](https://www.chartjs.org/)**: For rendering the interactive hourly forecast graph.
- **[FontAwesome 6](https://fontawesome.com/)**: For iconography.
- **[Open-Meteo API](https://open-meteo.com/)**: For free, open-source weather forecasting data.
- **OpenStreetMap Geocoding API**: For resolving user-entered cities/zip codes into coordinates.

## 💻 Try It Live

Run it locally by opening [index.html](index.html) in your browser, or publish with GitHub Pages.

## 🎨 Notable Design Choices

- **No Backend / API Keys:** By utilizing Open-Meteo and OpenStreetMap, the app operates entirely client-side without requiring users or developers to manage API keys or backend servers.
- **Dark Mode UI:** Designed with a dark "slate" theme, gradient text, and "glass-card" aesthetic for comfortable viewing and strong visual hierarchy.
- **Friendly Copy:** The interface uses welcoming, supportive language while keeping weather details easy to understand.
- **Accessibility & Clarity:** Key meteorological data is simplified into visual cards and concise labels, giving users actionable context.

---

*Disclaimer: This project provides general weather information and planning insights. Conditions may change quickly, so check official local alerts for critical decisions.*
