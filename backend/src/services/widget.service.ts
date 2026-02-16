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
            const response = await fetch(`https://wttr.in/${city}?format=j1`);
            const data = await response.json() as any;
            const current = data.current_condition[0];

            const descMap: any = {
                'Sunny': 'Açık',
                'Clear': 'Açık',
                'Partly cloudy': 'Parçalı Bulutlu',
                'Cloudy': 'Bulutlu',
                'Overcast': 'Kapalı',
                'Mist': 'Sisli',
                'Patchy rain possible': 'Yer yer yağmurlu',
                'Light rain': 'Hafif Yağmurlu',
                'Rain': 'Yağmurlu'
            };

            return {
                temp: current.temp_C,
                desc: descMap[current.weatherDesc[0].value] || current.weatherDesc[0].value,
                humidity: current.humidity,
                city: city === 'Istanbul' ? 'İstanbul' : city
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
                return data.items.slice(0, 5).map((item: any) => item.title);
            }
            return [];
        } catch (error) {
            console.error("Haber çekme hatası:", error);
            return [];
        }
    }

    static async getAllData() {
        const [rates, weather, news] = await Promise.all([
            this.getExchangeRates(),
            this.getWeather(),
            this.getNews()
        ]);

        return {
            rates,
            weather,
            news
        };
    }
}
