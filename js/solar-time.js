/**
 * solar-time.js — 진태양시(眞太陽時) 보정 모듈.
 *
 * 진태양시 = 지방표준시 + 경도보정 + 균시차(Equation of Time)
 *
 * 경도보정: (출생지 경도 − 표준자오선) × 4분/도
 *   예) 서울(127°E), KST 표준자오선(135°E) → (127−135)×4 = −32분
 *
 * 균시차: 태양의 실제 위치와 평균 위치 차이 (연중 ±16분 변동)
 */

// ── 도시별 경도 + 표준자오선(timezone offset → standard meridian) ─────────────

/**
 * { "City, Country": [longitude, utcOffsetHours] }
 * utcOffset은 표준시 기준 (서머타임 미적용).
 * 표준자오선 = utcOffset × 15°
 */
const CITY_COORDS = {
  // Korean cities (KST = UTC+9, standard meridian = 135°E)
  "Seoul, South Korea":     [126.98, 9],
  "Busan, South Korea":     [129.08, 9],
  "Incheon, South Korea":   [126.71, 9],
  "Daegu, South Korea":     [128.60, 9],
  "Daejeon, South Korea":   [127.38, 9],
  "Gwangju, South Korea":   [126.85, 9],
  "Suwon, South Korea":     [127.01, 9],
  "Ulsan, South Korea":     [129.31, 9],
  "Changwon, South Korea":  [128.68, 9],

  // Japanese cities (JST = UTC+9, standard meridian = 135°E)
  "Tokyo, Japan":           [139.69, 9],
  "Osaka, Japan":           [135.50, 9],
  "Kyoto, Japan":           [135.77, 9],
  "Nagoya, Japan":          [136.91, 9],
  "Fukuoka, Japan":         [130.42, 9],
  "Sapporo, Japan":         [141.35, 9],
  "Hiroshima, Japan":       [132.46, 9],
  "Kobe, Japan":            [135.18, 9],
  "Yokohama, Japan":        [139.64, 9],

  // Chinese cities (CST = UTC+8, standard meridian = 120°E)
  "Beijing, China":         [116.41, 8],
  "Shanghai, China":        [121.47, 8],
  "Guangzhou, China":       [113.26, 8],
  "Shenzhen, China":        [114.06, 8],
  "Chengdu, China":         [104.07, 8],
  "Chongqing, China":       [106.55, 8],
  "Hangzhou, China":        [120.15, 8],
  "Nanjing, China":         [118.80, 8],
  "Tianjin, China":         [117.19, 8],
  "Wuhan, China":           [114.31, 8],
  "Xi'an, China":           [108.94, 8],
  "Zhengzhou, China":       [113.65, 8],
  "Hong Kong, China":       [114.17, 8],
  "Macau, China":           [113.54, 8],
  "Taipei, Taiwan":         [121.57, 8],

  // Southeast Asia
  "Bangkok, Thailand":      [100.50, 7],
  "Hanoi, Vietnam":         [105.85, 7],
  "Ho Chi Minh City, Vietnam": [106.63, 7],
  "Singapore, Singapore":   [103.82, 8],
  "Kuala Lumpur, Malaysia": [101.69, 8],
  "Jakarta, Indonesia":     [106.85, 7],
  "Manila, Philippines":    [120.98, 8],
  "Phnom Penh, Cambodia":   [104.92, 7],
  "Yangon, Myanmar":        [96.17, 6.5],
  "Chiang Mai, Thailand":   [98.98, 7],
  "Phuket, Thailand":       [98.39, 7],
  "Bali, Indonesia":        [115.19, 8],
  "Bandung, Indonesia":     [107.61, 7],
  "Cebu, Philippines":      [123.90, 8],
  "Denpasar, Indonesia":    [115.22, 8],
  "Johor Bahru, Malaysia":  [103.76, 8],
  "Medan, Indonesia":       [98.67, 7],
  "Penang, Malaysia":       [100.33, 8],
  "Surabaya, Indonesia":    [112.75, 7],
  "Colombo, Sri Lanka":     [79.86, 5.5],

  // South Asia
  "Delhi, India":           [77.21, 5.5],
  "Mumbai, India":          [72.88, 5.5],
  "Bangalore, India":       [77.59, 5.5],
  "Chennai, India":         [80.27, 5.5],
  "Hyderabad, India":       [78.47, 5.5],
  "Kolkata, India":         [88.36, 5.5],
  "Ahmedabad, India":       [72.57, 5.5],
  "Pune, India":            [73.86, 5.5],
  "Jaipur, India":          [75.79, 5.5],
  "Lucknow, India":         [80.95, 5.5],
  "Kanpur, India":          [80.35, 5.5],
  "Nagpur, India":          [79.09, 5.5],
  "Patna, India":           [85.14, 5.5],
  "Surat, India":           [72.83, 5.5],
  "Bhopal, India":          [77.41, 5.5],
  "Chandigarh, India":      [76.78, 5.5],
  "Coimbatore, India":      [76.96, 5.5],
  "Kochi, India":           [76.27, 5.5],
  "Dhaka, Bangladesh":      [90.41, 6],
  "Karachi, Pakistan":      [67.01, 5],
  "Lahore, Pakistan":       [74.35, 5],
  "Islamabad, Pakistan":    [73.05, 5],
  "Kathmandu, Nepal":       [85.32, 5.75],
  "Kabul, Afghanistan":     [69.17, 4.5],

  // Middle East
  "Dubai, United Arab Emirates":  [55.30, 4],
  "Abu Dhabi, United Arab Emirates": [54.37, 4],
  "Doha, Qatar":            [51.53, 3],
  "Kuwait City, Kuwait":    [47.98, 3],
  "Riyadh, Saudi Arabia":   [46.72, 3],
  "Jeddah, Saudi Arabia":   [39.17, 3],
  "Mecca, Saudi Arabia":    [39.83, 3],
  "Medina, Saudi Arabia":   [39.61, 3],
  "Muscat, Oman":           [58.39, 4],
  "Tehran, Iran":           [51.39, 3.5],
  "Baghdad, Iraq":          [44.37, 3],
  "Beirut, Lebanon":        [35.50, 2],
  "Damascus, Syria":        [36.29, 2],
  "Amman, Jordan":          [35.93, 2],
  "Tel Aviv, Israel":       [34.78, 2],

  // Europe
  "London, United Kingdom": [-0.13, 0],
  "Paris, France":          [2.35, 1],
  "Berlin, Germany":        [13.40, 1],
  "Madrid, Spain":          [-3.70, 1],
  "Rome, Italy":            [12.50, 1],
  "Amsterdam, Netherlands": [4.90, 1],
  "Brussels, Belgium":      [4.35, 1],
  "Vienna, Austria":        [16.37, 1],
  "Prague, Czech Republic": [14.42, 1],
  "Warsaw, Poland":         [21.01, 1],
  "Budapest, Hungary":      [19.04, 1],
  "Bucharest, Romania":     [26.10, 2],
  "Athens, Greece":         [23.73, 2],
  "Istanbul, Turkey":       [28.98, 3],
  "Ankara, Turkey":         [32.87, 3],
  "Moscow, Russia":         [37.62, 3],
  "Stockholm, Sweden":      [18.07, 1],
  "Oslo, Norway":           [10.75, 1],
  "Copenhagen, Denmark":    [12.57, 1],
  "Helsinki, Finland":      [24.94, 2],
  "Dublin, Ireland":        [-6.26, 0],
  "Lisbon, Portugal":       [-9.14, 0],
  "Barcelona, Spain":       [2.17, 1],
  "Milan, Italy":           [9.19, 1],
  "Munich, Germany":        [11.58, 1],
  "Hamburg, Germany":        [9.99, 1],
  "Frankfurt, Germany":     [8.68, 1],
  "Cologne, Germany":       [6.96, 1],
  "Dusseldorf, Germany":    [6.77, 1],
  "Stuttgart, Germany":     [9.18, 1],
  "Bremen, Germany":        [8.80, 1],
  "Lyon, France":           [4.83, 1],
  "Marseille, France":      [5.37, 1],
  "Nice, France":           [7.26, 1],
  "Lille, France":          [3.06, 1],
  "Bordeaux, France":       [-0.58, 1],
  "Edinburgh, United Kingdom": [-3.19, 0],
  "Manchester, United Kingdom": [-2.24, 0],
  "Birmingham, United Kingdom": [-1.90, 0],
  "Glasgow, United Kingdom":    [-4.25, 0],
  "Leeds, United Kingdom":      [-1.55, 0],
  "Bristol, United Kingdom":    [-2.59, 0],
  "Naples, Italy":          [14.25, 1],
  "Florence, Italy":        [11.25, 1],
  "Turin, Italy":           [7.69, 1],
  "Venice, Italy":          [12.34, 1],
  "Bologna, Italy":         [11.34, 1],
  "Palermo, Italy":         [13.36, 1],
  "Porto, Portugal":        [-8.61, 0],
  "Seville, Spain":         [-5.98, 1],
  "Valencia, Spain":        [-0.38, 1],
  "Rotterdam, Netherlands": [4.47, 1],
  "Utrecht, Netherlands":   [5.12, 1],
  "Antwerp, Belgium":       [4.40, 1],
  "Geneva, Switzerland":    [6.14, 1],
  "Zurich, Switzerland":    [8.54, 1],
  "Sofia, Bulgaria":        [23.32, 2],
  "Belgrade, Serbia":       [20.46, 1],
  "Zagreb, Croatia":        [15.98, 1],
  "Bratislava, Slovakia":   [17.11, 1],
  "Ljubljana, Slovenia":    [14.51, 1],
  "Tirana, Albania":        [19.82, 1],
  "Riga, Latvia":           [24.11, 2],
  "Vilnius, Lithuania":     [25.28, 2],
  "Kiev, Ukraine":          [30.52, 2],
  "Minsk, Belarus":         [27.55, 3],
  "Krakow, Poland":         [19.94, 1],
  "Gdansk, Poland":         [18.65, 1],
  "Wroclaw, Poland":        [17.04, 1],
  "Thessaloniki, Greece":   [22.94, 2],
  "Nicosia, Cyprus":        [33.38, 2],
  "Reykjavik, Iceland":     [-21.90, 0],
  "Luxembourg City, Luxembourg": [6.13, 1],
  "Tbilisi, Georgia":       [44.83, 4],
  "Yerevan, Armenia":       [44.51, 4],
  "Baku, Azerbaijan":       [49.87, 4],
  "Almeria, Spain":         [-2.46, 1],
  "Malaga, Spain":          [-4.42, 1],
  "Izmir, Turkey":          [27.14, 3],

  // Africa
  "Cairo, Egypt":           [31.24, 2],
  "Lagos, Nigeria":         [3.39, 1],
  "Johannesburg, South Africa": [28.05, 2],
  "Cape Town, South Africa":    [18.42, 2],
  "Nairobi, Kenya":         [36.82, 3],
  "Addis Ababa, Ethiopia":  [38.75, 3],
  "Casablanca, Morocco":    [-7.59, 1],
  "Accra, Ghana":           [-0.19, 0],
  "Dakar, Senegal":         [-17.44, 0],
  "Dar es Salaam, Tanzania":[39.27, 3],
  "Durban, South Africa":   [31.05, 2],
  "Harare, Zimbabwe":       [31.05, 2],
  "Kampala, Uganda":        [32.58, 3],
  "Khartoum, Sudan":        [32.53, 2],
  "Kinshasa, Democratic Republic of the Congo": [15.27, 1],
  "Luanda, Angola":         [13.23, 1],
  "Lusaka, Zambia":         [28.28, 2],
  "Maputo, Mozambique":     [32.57, 2],
  "Mogadishu, Somalia":     [45.34, 3],
  "Niamey, Niger":          [2.11, 1],
  "Pretoria, South Africa": [28.19, 2],
  "Rabat, Morocco":         [-6.85, 1],
  "Tripoli, Libya":         [13.18, 2],
  "Tunis, Tunisia":         [10.17, 1],
  "Yaounde, Cameroon":      [11.52, 1],
  "Abuja, Nigeria":         [7.49, 1],
  "Algiers, Algeria":       [3.06, 1],
  "Antananarivo, Madagascar": [47.52, 3],
  "Ouagadougou, Burkina Faso": [-1.52, 0],
  "Port Louis, Mauritius":  [57.50, 4],

  // North America
  "New York, United States":       [-74.01, -5],
  "Los Angeles, United States":    [-118.24, -8],
  "Chicago, United States":        [-87.63, -6],
  "Houston, United States":        [-95.37, -6],
  "Phoenix, United States":        [-112.07, -7],
  "San Francisco, United States":  [-122.42, -8],
  "Seattle, United States":        [-122.33, -8],
  "Miami, United States":          [-80.19, -5],
  "Dallas, United States":         [-96.80, -6],
  "Denver, United States":         [-104.99, -7],
  "Washington DC, United States":  [-77.04, -5],
  "Philadelphia, United States":   [-75.17, -5],
  "Minneapolis, United States":    [-93.27, -6],
  "Atlanta, United States":        [-84.39, -5],
  "Austin, United States":         [-97.74, -6],
  "Baltimore, United States":      [-76.61, -5],
  "Boston, United States":         [-71.06, -5],
  "Charlotte, United States":      [-80.84, -5],
  "Columbus, United States":       [-82.99, -5],
  "Detroit, United States":        [-83.05, -5],
  "El Paso, United States":        [-106.44, -7],
  "Fort Worth, United States":     [-97.33, -6],
  "Indianapolis, United States":   [-86.16, -5],
  "Jacksonville, United States":   [-81.66, -5],
  "Las Vegas, United States":      [-115.14, -8],
  "Louisville, United States":     [-85.76, -5],
  "Memphis, United States":        [-90.05, -6],
  "Nashville, United States":      [-86.78, -6],
  "Oklahoma City, United States":  [-97.52, -6],
  "Orlando, United States":        [-81.38, -5],
  "Portland, United States":       [-122.68, -8],
  "Sacramento, United States":     [-121.49, -8],
  "San Antonio, United States":    [-98.49, -6],
  "San Diego, United States":      [-117.16, -8],
  "San Jose, United States":       [-121.89, -8],
  "Tampa, United States":          [-82.46, -5],
  "Tucson, United States":         [-110.97, -7],
  "Toronto, Canada":               [-79.38, -5],
  "Montreal, Canada":              [-73.57, -5],
  "Vancouver, Canada":             [-123.12, -8],
  "Calgary, Canada":               [-114.07, -7],
  "Ottawa, Canada":                [-75.70, -5],
  "Mexico City, Mexico":           [-99.13, -6],
  "Havana, Cuba":                  [-82.37, -5],
  "Guatemala City, Guatemala":     [-90.53, -6],
  "Managua, Nicaragua":            [-86.25, -6],
  "Panama City, Panama":           [-79.52, -5],
  "San Jose, Costa Rica":          [-84.08, -6],
  "Santo Domingo, Dominican Republic": [-69.94, -4],
  "Port-au-Prince, Haiti":        [-72.34, -5],

  // South America
  "Sao Paulo, Brazil":             [-46.63, -3],
  "Buenos Aires, Argentina":       [-58.38, -3],
  "Rio de Janeiro, Brazil":        [-43.17, -3],
  "Santiago, Chile":               [-70.67, -4],
  "Bogota, Colombia":              [-74.07, -5],
  "Lima, Peru":                    [-77.04, -5],
  "Caracas, Venezuela":            [-66.90, -4],
  "Montevideo, Uruguay":           [-56.16, -3],
  "Quito, Ecuador":                [-78.52, -5],
  "Asuncion, Paraguay":            [-57.57, -4],

  // Oceania
  "Sydney, Australia":             [151.21, 10],
  "Melbourne, Australia":          [144.96, 10],
  "Brisbane, Australia":           [153.03, 10],
  "Perth, Australia":              [115.86, 8],
  "Adelaide, Australia":           [138.60, 9.5],
  "Auckland, New Zealand":         [174.76, 12],
  "Wellington, New Zealand":       [174.78, 12],
  "Port Moresby, Papua New Guinea": [147.15, 10],

  // Other
  "Pyongyang, North Korea": [125.75, 9],
  "Ulaanbaatar, Mongolia":  [106.91, 8],
  "Tashkent, Uzbekistan":   [69.28, 5],
  "Almaty, Kazakhstan":     [76.95, 6],
};

// ── 균시차 (Equation of Time) ────────────────────────────────────────────────

const DEG = Math.PI / 180;

/**
 * 균시차를 분 단위로 반환합니다.
 * 양수 = 진태양시가 평균태양시보다 빠름.
 * @param {Date} date
 * @returns {number} minutes
 */
function equationOfTime(date) {
  // Day of year
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);

  // Approximate formula (Spencer, 1971)
  const B = (360 / 365) * (dayOfYear - 81) * DEG;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

// ── 12시진 경계 ──────────────────────────────────────────────────────────────

const ZODIAC_HOURS = [
  { name: 'RAT',     start: 23, end: 1  },
  { name: 'OX',      start: 1,  end: 3  },
  { name: 'TIGER',   start: 3,  end: 5  },
  { name: 'RABBIT',  start: 5,  end: 7  },
  { name: 'DRAGON',  start: 7,  end: 9  },
  { name: 'SNAKE',   start: 9,  end: 11 },
  { name: 'HORSE',   start: 11, end: 13 },
  { name: 'SHEEP',   start: 13, end: 15 },
  { name: 'MONKEY',  start: 15, end: 17 },
  { name: 'ROOSTER', start: 17, end: 19 },
  { name: 'DOG',     start: 19, end: 21 },
  { name: 'PIG',     start: 21, end: 23 },
];

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * 도시명으로 [경도, UTC오프셋] 조회.
 * @param {string} cityLabel — "City, Country" 형식
 * @returns {{ longitude: number, utcOffset: number } | null}
 */
export function getCityCoords(cityLabel) {
  const entry = CITY_COORDS[cityLabel];
  if (!entry) return null;
  return { longitude: entry[0], utcOffset: entry[1] };
}

/**
 * 진태양시를 계산합니다.
 *
 * @param {Date} date — 생년월일
 * @param {number} hour — 출생 시 (0–23)
 * @param {number} minute — 출생 분 (0–59)
 * @param {number} longitude — 출생지 경도
 * @param {number} utcOffset — 표준시 UTC 오프셋 (시간 단위, e.g. 9 for KST)
 * @returns {{ trueSolarHour: number, trueSolarMinute: number, correctionMinutes: number }}
 */
export function getTrueSolarTime(date, hour, minute, longitude, utcOffset) {
  const standardMeridian = utcOffset * 15; // 표준자오선
  const longitudeCorrection = (longitude - standardMeridian) * 4; // 분 단위
  const eot = equationOfTime(date);

  const totalCorrection = longitudeCorrection + eot;
  let totalMinutes = hour * 60 + minute + totalCorrection;

  // 24시간 범위로 정규화
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  return {
    trueSolarHour:    Math.floor(totalMinutes / 60),
    trueSolarMinute:  Math.round(totalMinutes % 60),
    correctionMinutes: Math.round(totalCorrection),
  };
}

/**
 * 시간(0–23)으로 해당하는 12시진(동물) 이름을 반환합니다.
 * @param {number} hour — 0–23
 * @returns {string} zodiac name (e.g. 'RAT', 'OX', ...)
 */
export function getZodiacFromHour(hour) {
  if (hour >= 23 || hour < 1) return 'RAT';
  if (hour < 3)  return 'OX';
  if (hour < 5)  return 'TIGER';
  if (hour < 7)  return 'RABBIT';
  if (hour < 9)  return 'DRAGON';
  if (hour < 11) return 'SNAKE';
  if (hour < 13) return 'HORSE';
  if (hour < 15) return 'SHEEP';
  if (hour < 17) return 'MONKEY';
  if (hour < 19) return 'ROOSTER';
  if (hour < 21) return 'DOG';
  return 'PIG';
}

/**
 * 출생 시간 + 도시로 보정된 시주 동물을 자동 결정합니다.
 *
 * @param {Date} date — 생년월일
 * @param {number} hour — 출생 시 (0–23)
 * @param {number} minute — 출생 분 (0–59)
 * @param {string} cityLabel — "City, Country" 형식
 * @returns {{ zodiac: string, correctionMinutes: number, trueSolarHour: number, trueSolarMinute: number } | null}
 *   null if city not found in database
 */
export function correctBirthTime(date, hour, minute, cityLabel) {
  const coords = getCityCoords(cityLabel);
  if (!coords) return null;

  const { trueSolarHour, trueSolarMinute, correctionMinutes } =
    getTrueSolarTime(date, hour, minute, coords.longitude, coords.utcOffset);

  return {
    zodiac: getZodiacFromHour(trueSolarHour),
    correctionMinutes,
    trueSolarHour,
    trueSolarMinute,
  };
}

export { CITY_COORDS };
