# Blenheim Forecast

A free, non-commercial weather consensus dashboard for Blenheim, Marlborough. It compares independent global forecast models, publishes the median forecast, and makes wind speed, gusts, direction, and model spread first-class information.

Live site: [mttm9909-ai.github.io/Weather-Analysis](https://mttm9909-ai.github.io/Weather-Analysis/)

## What it does

- Refreshes every three hours through GitHub Actions and deploys to GitHub Pages.
- Compares ECMWF IFS, NOAA GFS, DWD ICON, UKMO Global, BOM ACCESS-G, and Environment Canada GEM through the free [Open-Meteo API](https://open-meteo.com/en/docs).
- Uses KMA GDPS as an explicitly labelled fallback when ACCESS-G is unavailable. It is never silently relabelled as ACCESS-G.
- Shows Yr / MET Norway as a reference forecast but excludes it from the vote to avoid counting its ECMWF-derived guidance twice.
- Combines temperature, rain, humidity, cloud, pressure, and gusts with a robust median.
- Combines sustained wind as east–west and north–south vectors before converting the result back into a compass bearing. This correctly handles north-crossing directions such as 350° and 10°.
- Measures model direction disagreement using the shortest circular distance and includes it in wind confidence.
- Shows 48-hour weather and wind outlooks, including gust forecasts, model spread, peak timing and wind direction, alongside rain timing and vineyard-oriented frost and spray-window guidance.
- Lets each user set persistent sustained-wind and gust watch thresholds, draws them on the wind chart, and reports the next crossing plus affected hours.

No API key, paid account, backend, or database is required.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm install
npm run data:fetch
npm test
npm run dev
```

If a live data file is not present, the interface deliberately shows clearly labelled preview data. The generated `public/data/forecast.json` is safe to commit but does not need to be: the deployment workflow creates it before every build.

## Deploy on GitHub Pages

1. Create a public GitHub repository and push this project to its `main` branch.
2. Open **Settings → Pages** in the repository.
3. Set **Source** to **GitHub Actions**.
4. Run **Actions → Refresh forecast and deploy → Run workflow**, or push a commit.

The workflow also runs at minute 37 every third hour. GitHub notes that scheduled workflows can be delayed during periods of high load and can be disabled after 60 days without repository activity. The manual workflow trigger remains available.

## Forecast method

Only operational, independently labelled models vote. For each local forecast hour:

1. Scalar fields use the median, which limits the effect of one outlying model.
2. Wind speed and direction are converted to vectors, averaged, then converted back to a meteorological “from” bearing.
3. Rain agreement is the percentage of models predicting at least 0.2 mm in that hour.
4. The full model min/max range is retained for temperature, rain, wind speed, and gusts.
5. Publishing stops if fewer than three independent models are available, leaving the previous successful Pages deployment intact.

The accuracy panel begins in a labelled learning state. It does not pretend historical verification exists; adding an observation archive is a future enhancement.

## Sources and responsible use

Live machine-readable data comes only from services that publish free API access:

- [Open-Meteo terms and attribution](https://open-meteo.com/en/terms)
- [MET Norway Locationforecast API](https://api.met.no/weatherapi/locationforecast/2.0/documentation)

The dashboard links to Yr, Ventusky, Weather Underground, MetService, NIWA Weather, and PredictWind for human comparison. It does not scrape their webpages or bypass logins, rate limits, or commercial licences.

This is consensus guidance for personal use, not an official forecast, severe-weather warning service, or a substitute for chemical labels and local safety requirements. For official New Zealand warnings, use [MetService](https://www.metservice.com/warnings/home).

## Project structure

- `scripts/fetch-weather.mjs` — free API collection and normalization
- `scripts/consensus.mjs` — wind vectors, median consensus, confidence, rain, and vineyard logic
- `scripts/consensus.test.mjs` — regression tests, including the 350°/10° wind case
- `src/` — responsive React dashboard
- `.github/workflows/deploy.yml` — scheduled refresh, test, build, and Pages deployment
