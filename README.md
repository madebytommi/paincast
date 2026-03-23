# PainCast 🌩️

**PainCast** is a daily weather companion designed specifically for individuals dealing with chronic pain. It translates complex weather data—temperature, barometric pressure, and humidity—into a simple 0-10 pain forecast index. 

By helping you understand how upcoming weather patterns might affect your body, PainCast allows you to plan your day with confidence instead of being surprised by sudden pain flares.

## 🚀 What It Does

- **Real-Time Pain Index:** Calculates a current pain score (0 to 10) based on local weather conditions.
- **Detailed Factor Breakdown:** Transparently shows *why* the index is what it is by breaking down contributing factors (e.g., cold temperatures, rapid barometric changes, high base pressure, and high humidity).
- **24-Hour Pain Outlook:** Visualizes your expected pain levels throughout the day using an interactive chart.
- **7-Day Forecast:** Provides a week-long outlook so you can plan your schedule around incoming weather systems.
- **Location Detection:** Automatically acquires your location via your browser or allows manual location entry using OpenStreetMap geocoding.

## 🛠️ Technologies Used

PainCast is built entirely as a static, client-side application requiring no backend or build process:

- **HTML5 & CSS3**
- **Vanilla JavaScript**
- **[Bootstrap 5.3](https://getbootstrap.com/)**: For responsive layout and utility classes.
- **[Chart.js](https://www.chartjs.org/)**: For rendering the interactive 24-hour pain forecast graph.
- **[FontAwesome 6](https://fontawesome.com/)**: For iconography.
- **[Open-Meteo API](https://open-meteo.com/)**: For free, open-source weather forecasting data.
- **OpenStreetMap Geocoding API**: For resolving user-entered cities/zip codes into coordinates.

## 💻 Try It Live

You can try PainCast directly in your browser right now! Visit the live site here:

**[https://tommithetechie.github.io/paincast/](https://tommithetechie.github.io/paincast/)**

## 🎨 Notable Design Choices

- **No Backend / API Keys:** By utilizing Open-Meteo and OpenStreetMap, the app operates entirely client-side without requiring users or developers to manage API keys or backend servers.
- **Dark Mode UI:** Designed with a dark "slate" theme, gradient text, and "glass-card" aesthetic to minimize screen glare and eye strain for users who may be light-sensitive during migraines or pain flares.
- **Empathy-First Copy:** The interface uses supportive language ("Knowledge is your superpower today," "You're not alone in this") and includes medical disclaimers to ensure users understand the tool is an estimate based on weather studies, not a diagnostic medical device.
- **Accessibility & Clarity:** Complex meteorological shifts are simplified into visual "Index Factors" with easy-to-read thresholds (e.g., "Colder than 59°F" or "Relative humidity over 60%"), giving users actionable context.

---

*Disclaimer: This project provides estimates based on general weather studies. Every body reacts differently to weather changes. PainCast is intended as a personal planning guide, not as professional medical advice.*
