import { vincentyDistance } from './geodesy'
// Simple reverse geocoding for major cities impact detection
// For educational simulation purposes

export interface City {
  name: string
  country: string
  lat: number
  lng: number
  population: number
}

// Major world cities for impact detection
export const MAJOR_CITIES: City[] = [
  { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, population: 37400068 },
  { name: "Delhi", country: "India", lat: 28.7041, lng: 77.1025, population: 30290936 },
  { name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737, population: 27058479 },
  { name: "Dhaka", country: "Bangladesh", lat: 23.8103, lng: 90.4125, population: 21005860 },
  { name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, population: 22043028 },
  { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, population: 20484965 },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, population: 21581093 },
  { name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074, population: 21542000 },
  { name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777, population: 20411274 },
  { name: "Osaka", country: "Japan", lat: 34.6937, lng: 135.5023, population: 19222665 },
  { name: "New York", country: "USA", lat: 40.7128, lng: -74.0060, population: 18819000 },
  { name: "Karachi", country: "Pakistan", lat: 24.8607, lng: 67.0011, population: 15400000 },
  { name: "Chongqing", country: "China", lat: 29.4316, lng: 106.9123, population: 15872179 },
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784, population: 15462452 },
  { name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639, population: 14681589 },
  { name: "Manila", country: "Philippines", lat: 14.5995, lng: 120.9842, population: 13482462 },
  { name: "Lagos", country: "Nigeria", lat: 6.5244, lng: 3.3792, population: 13463420 },
  { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729, population: 13293479 },
  { name: "Tianjin", country: "China", lat: 39.3434, lng: 117.3616, population: 13215344 },
  { name: "Kinshasa", country: "Congo", lat: -4.4419, lng: 15.2663, population: 13171000 },
  { name: "Guangzhou", country: "China", lat: 23.1291, lng: 113.2644, population: 12967862 },
  { name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437, population: 12815475 },
  { name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173, population: 12537954 },
  { name: "Shenzhen", country: "China", lat: 22.5431, lng: 114.0579, population: 12357938 },
  { name: "Lahore", country: "Pakistan", lat: 31.5204, lng: 74.3587, population: 12188196 },
  { name: "Bangalore", country: "India", lat: 12.9716, lng: 77.5946, population: 11882666 },
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, population: 11017230 },
  { name: "Bogotá", country: "Colombia", lat: 4.7110, lng: -74.0721, population: 10574876 },
  { name: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456, population: 10517000 },
  { name: "Chennai", country: "India", lat: 13.0827, lng: 80.2707, population: 10456000 },
  { name: "Lima", country: "Peru", lat: -12.0464, lng: -77.0428, population: 10391945 },
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018, population: 10156000 },
  { name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780, population: 9720846 },
  { name: "Nagoya", country: "Japan", lat: 35.1815, lng: 136.9066, population: 9645000 },
  { name: "Hyderabad", country: "India", lat: 17.3850, lng: 78.4867, population: 9482000 },
  { name: "London", country: "UK", lat: 51.5074, lng: -0.1278, population: 9304016 },
  { name: "Tehran", country: "Iran", lat: 35.6892, lng: 51.3890, population: 9259009 },
  { name: "Chicago", country: "USA", lat: 41.8781, lng: -87.6298, population: 9458539 },
  { name: "Chengdu", country: "China", lat: 30.5728, lng: 104.0668, population: 8813000 },
  { name: "Nanjing", country: "China", lat: 32.0603, lng: 118.7969, population: 8505000 },
  { name: "Wuhan", country: "China", lat: 30.5928, lng: 114.3055, population: 8364977 },
  { name: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lng: 106.6297, population: 8224400 },
  { name: "Luanda", country: "Angola", lat: -8.8390, lng: 13.2894, population: 8044000 },
  { name: "Ahmedabad", country: "India", lat: 23.0225, lng: 72.5714, population: 7692000 },
  { name: "Kuala Lumpur", country: "Malaysia", lat: 3.1390, lng: 101.6869, population: 7564000 },
  { name: "Xi'an", country: "China", lat: 34.2667, lng: 108.9000, population: 7444000 },
  { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694, population: 7394000 },
  { name: "Dongguan", country: "China", lat: 23.0489, lng: 113.7447, population: 7300000 },
  { name: "Hangzhou", country: "China", lat: 30.2741, lng: 120.1551, population: 7236000 },
  { name: "Foshan", country: "China", lat: 23.0218, lng: 113.1226, population: 7194000 },
  { name: "Shenyang", country: "China", lat: 41.8057, lng: 123.4315, population: 6921000 },
  { name: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lng: 46.6753, population: 6906888 },
  { name: "Baghdad", country: "Iraq", lat: 33.3152, lng: 44.3661, population: 6812000 },
  { name: "Santiago", country: "Chile", lat: -33.4489, lng: -70.6693, population: 6680000 },
  { name: "Pune", country: "India", lat: 18.5204, lng: 73.8567, population: 6629347 },
  { name: "Miami", country: "USA", lat: 25.7617, lng: -80.1918, population: 6158824 },
  { name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038, population: 6155116 },
  { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, population: 6082000 },
  { name: "Dar es Salaam", country: "Tanzania", lat: -6.7924, lng: 39.2083, population: 6048000 },
  { name: "Belo Horizonte", country: "Brazil", lat: -19.9191, lng: -43.9386, population: 5972000 },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, population: 5850342 },
  { name: "Philadelphia", country: "USA", lat: 39.9526, lng: -75.1652, population: 5695000 },
  { name: "Washington D.C.", country: "USA", lat: 38.9072, lng: -77.0369, population: 5379000 },
  { name: "Barcelona", country: "Spain", lat: 41.3851, lng: 2.1734, population: 5258319 },
  { name: "Saint Petersburg", country: "Russia", lat: 59.9311, lng: 30.3609, population: 5351935 },
  { name: "Yangon", country: "Myanmar", lat: 16.8661, lng: 96.1951, population: 5209541 },
  { name: "Dalian", country: "China", lat: 38.9140, lng: 121.6147, population: 5106000 },
  { name: "Dallas", country: "USA", lat: 32.7767, lng: -96.7970, population: 5144000 },
  { name: "Karachi", country: "Pakistan", lat: 24.8607, lng: 67.0011, population: 15400000 },
  { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, population: 5312163 },
  { name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631, population: 5078193 },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241, population: 4524000 },
  { name: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050, population: 3677472 },
  { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, population: 2844750 },
  { name: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738, population: 1911191 }
]

// Calculate distance between two lat/lng points using Haversine formula
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Return distance in km using accurate Vincenty distance on WGS84
  return vincentyDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }) / 1000
}

// Find the nearest city to impact coordinates
export function findNearestCity(impactLat: number, impactLng: number): { city: City | null, distance: number } {
  let nearestCity: City | null = null
  let minDistance = Infinity

  for (const city of MAJOR_CITIES) {
    const distance = calculateDistance(impactLat, impactLng, city.lat, city.lng)
    if (distance < minDistance) {
      minDistance = distance
      nearestCity = city
    }
  }

  return { city: nearestCity, distance: minDistance }
}

// Get region/ocean name for remote areas
export function getRegionName(lat: number, lng: number): string {
  // Simple region classification
  if (lat > 66.5) return "Арктика"
  if (lat < -66.5) return "Антарктика"
  
  // Ocean classification (very simplified)
  if (lng >= -30 && lng <= 70 && lat >= -60 && lat <= 80) {
    if (lat >= 30) return "Северная Атлантика"
    if (lat >= 0) return "Экваториальная Атлантика"
    return "Южная Атлантика"
  }
  
  if (lng >= 70 && lng <= 180 && lat >= -60 && lat <= 80) {
    if (lat >= 0) return "Северная часть Индийского океана"
    return "Южная часть Индийского океана"
  }
  
  if ((lng >= 180 || lng <= -30) && lat >= -60 && lat <= 80) {
    if (lat >= 30) return "Северная часть Тихого океана"
    if (lat >= 0) return "Экваториальная часть Тихого океана"
    return "Южная часть Тихого океана"
  }
  
  return "Удаленный регион"
}

// Main function to get impact location description
export function getImpactLocation(lat: number, lng: number): string {
  const { city, distance } = findNearestCity(lat, lng)
  
  if (city && distance < 50) {
    return `${city.name}, ${city.country} (население: ${city.population.toLocaleString()})`
  } else if (city && distance < 200) {
    return `${distance.toFixed(0)} км от города ${city.name}, ${city.country}`
  } else {
    const region = getRegionName(lat, lng)
    return `${region} (удаленная область)`
  }
}