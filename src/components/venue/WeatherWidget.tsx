import { useQuery } from "@tanstack/react-query";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Droplets, Wind, Thermometer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
  isIndoor?: boolean;
}

const WMO_ICONS: Record<number, { icon: typeof Sun; label: string }> = {
  0: { icon: Sun, label: "Clear" },
  1: { icon: Sun, label: "Mostly clear" },
  2: { icon: Cloud, label: "Partly cloudy" },
  3: { icon: Cloud, label: "Overcast" },
  45: { icon: Cloud, label: "Foggy" },
  48: { icon: Cloud, label: "Icy fog" },
  51: { icon: CloudRain, label: "Light drizzle" },
  53: { icon: CloudRain, label: "Drizzle" },
  55: { icon: CloudRain, label: "Heavy drizzle" },
  61: { icon: CloudRain, label: "Light rain" },
  63: { icon: CloudRain, label: "Rain" },
  65: { icon: CloudRain, label: "Heavy rain" },
  71: { icon: CloudSnow, label: "Light snow" },
  73: { icon: CloudSnow, label: "Snow" },
  75: { icon: CloudSnow, label: "Heavy snow" },
  80: { icon: CloudRain, label: "Showers" },
  81: { icon: CloudRain, label: "Moderate showers" },
  82: { icon: CloudRain, label: "Heavy showers" },
  95: { icon: CloudLightning, label: "Thunderstorm" },
  96: { icon: CloudLightning, label: "Thunderstorm w/ hail" },
  99: { icon: CloudLightning, label: "Severe thunderstorm" },
};

const getWeatherInfo = (code: number) => WMO_ICONS[code] || WMO_ICONS[0];

const WeatherWidget = ({ latitude, longitude, isIndoor }: WeatherWidgetProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["weather", latitude, longitude],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { latitude, longitude },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 min
    enabled: !!latitude && !!longitude,
  });

  if (isLoading || !data?.current) return null;

  const current = data.current;
  const daily = data.daily;
  const weatherInfo = getWeatherInfo(current.weather_code);
  const Icon = weatherInfo.icon;

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-5" aria-labelledby="venue-weather-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="venue-weather-heading" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Thermometer className="h-4 w-4 text-primary" aria-hidden="true" />
          Local weather
        </h2>
        {isIndoor && (
          <span className="rounded-full border border-border bg-surface-1 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Indoor venue
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Icon className="h-9 w-9 text-primary" aria-hidden="true" />
        <div>
          <p className="stat-numeral text-2xl font-semibold text-foreground">
            {Math.round(current.temperature_2m)}°C
          </p>
          <p className="text-sm text-muted-foreground">{weatherInfo.label}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
          <Wind className="h-4 w-4" aria-hidden="true" />
          <span className="stat-numeral">{Math.round(current.wind_speed_10m)} km/h</span>
        </div>
      </div>

      {daily && (
        <div className="mt-4 grid grid-cols-5 gap-1 border-t border-border pt-4">
            {daily.time.slice(0, 5).map((date: string, i: number) => {
              const dayInfo = getWeatherInfo(daily.weather_code[i]);
              const DayIcon = dayInfo.icon;
              const dayLabel = i === 0 ? "Today" : new Date(date).toLocaleDateString("en", { weekday: "short" });
              return (
                <div key={date} className="min-w-0 space-y-1 text-center">
                  <p className="text-xs text-muted-foreground">{dayLabel}</p>
                  <DayIcon className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <p className="stat-numeral text-xs font-medium text-foreground">
                    {Math.round(daily.temperature_2m_max[i])}°
                  </p>
                  {daily.precipitation_probability_max[i] > 20 && (
                    <div className="flex items-center justify-center gap-0.5 text-[11px] text-information">
                      <Droplets className="h-3 w-3" aria-hidden="true" />
                      {daily.precipitation_probability_max[i]}%
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
};

export default WeatherWidget;
