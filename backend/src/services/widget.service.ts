import * as https from 'https';

export class WidgetService {
    static async getExchangeRates() {
        try {
            const response = await fetch('https://finans.truncgil.com/today.json');
            const data = await response.json() as any;

            return [
                { symbol: "$", name: "USD/TRY", value: data.USD?.Satış || "0", color: "#1e293b" },
                { symbol: "€", name: "EUR/TRY", value: data.EUR?.Satış || "0", color: "#1e293b" },
                { symbol: "G", name: "Altın", value: data['gram-altin']?.Satış || "0", color: "#F59E0B" }
            ];
        } catch (error) {
            console.error("Döviz kuru çekme hatası:", error);
            return [];
        }
    }

    static async getWeather(city: string = 'Istanbul') {
        try {
            const cityCoords: Record<string, { lat: number, lon: number }> = {
                'Istanbul': { lat: 41.0082, lon: 28.9784 },
                'Ankara': { lat: 39.9199, lon: 32.8543 },
                'Izmir': { lat: 38.4127, lon: 27.1384 },
                'Bursa': { lat: 40.1828, lon: 29.0667 },
                'Antalya': { lat: 36.8848, lon: 30.7040 },
                'Adana': { lat: 37.0017, lon: 35.3289 }
            };

            const coords = cityCoords[city] || cityCoords['Istanbul'];

            // We use https module with family: 4 to prevent Node's IPv6 timeout issues in some hostings
            const data: any = await new Promise((resolve, reject) => {
                const req = https.get(
                    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`,
                    { family: 4, timeout: 5000 },
                    (res) => {
                        let body = '';
                        res.on('data', (chunk) => body += chunk);
                        res.on('end', () => {
                            try {
                                resolve(JSON.parse(body));
                            } catch (e) {
                                reject(e);
                            }
                        });
                    }
                );
                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timed out'));
                });
            });

            const current = data.current_weather;

            // WMO Weather interpretation codes
            const code = current.weathercode;
            let desc = 'Açık';
            if (code >= 1 && code <= 3) desc = 'Parçalı Bulutlu';
            if (code >= 45 && code <= 48) desc = 'Sisli';
            if (code >= 51 && code <= 67) desc = 'Yağmurlu';
            if (code >= 71 && code <= 77) desc = 'Kar Yağışlı';
            if (code >= 80 && code <= 82) desc = 'Sağanak Yağışlı';
            if (code >= 95) desc = 'Fırtınalı';

            const displayCityMap: Record<string, string> = {
                'Istanbul': 'İstanbul', 'Ankara': 'Ankara', 'Izmir': 'İzmir',
                'Bursa': 'Bursa', 'Antalya': 'Antalya', 'Adana': 'Adana'
            };

            return {
                temp: Math.round(current.temperature),
                desc: desc,
                humidity: "N/A", // current_weather format of open-meteo doesn't give humidity in basic call unless requested separately
                city: displayCityMap[city] || city
            };
        } catch (error) {
            console.error("Hava durumu çekme hatası:", error);
            return null;
        }
    }

    static async getNews() {
        try {
            const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.aa.com.tr/tr/rss/default?cat=guncel');
            const data = await response.json() as any;

            if (data.status === 'ok') {
                return data.items.slice(0, 6).map((item: any) => ({
                    title: item.title,
                    link: item.link
                }));
            }
            return [];
        } catch (error) {
            console.error("Haber çekme hatası:", error);
            return [];
        }
    }

    static async getAllData(city: string = 'Istanbul') {
        const [rates, weather, news] = await Promise.all([
            this.getExchangeRates(),
            this.getWeather(city),
            this.getNews()
        ]);

        return {
            rates,
            weather,
            news
        };
    }
}
