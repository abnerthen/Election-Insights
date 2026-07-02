import { db, pool } from "./index";
import {
  electionsTable,
  partiesTable,
  constituenciesTable,
  candidatesTable,
  constituencyResultsTable,
  candidateVotesTable,
} from "./schema/elections";
import { eq } from "drizzle-orm";

const PARTIES = [
  { name: "Pakatan Harapan", abbreviation: "PH", color: "#e62627", description: "Center-left coalition" },
  { name: "Perikatan Nasional", abbreviation: "PN", color: "#022f54", description: "Right-wing coalition" },
  { name: "Barisan Nasional", abbreviation: "BN", color: "#000080", description: "Center-right coalition" },
  { name: "Gabungan Parti Sarawak", abbreviation: "GPS", color: "#f2bb13", description: "Sarawak regionalist coalition" },
  { name: "Gabungan Rakyat Sabah", abbreviation: "GRS", color: "#5bc0de", description: "Sabah regionalist coalition" },
  { name: "Independent", abbreviation: "IND", color: "#777777", description: "Independent candidates" },
  // { name: "Democratic Action Party", abbreviation: "DAP", color: "#cc0000", description: "Social democratic party (PH member)" },
  // { name: "Parti Keadilan Rakyat", abbreviation: "PKR", color: "#00adef", description: "Reformist party (PH member)" },
  // { name: "Parti Islam Se-Malaysia", abbreviation: "PAS", color: "#008000", description: "Islamic party (PN member)" },
];

const JOHOR_DUN_SEATS: { name: string; code: number; region: string; lng: number; lat: number, gridX?: number, gridY?: number }[] = [
  { code: 1, name: "Buloh Kasap", region: "Segamat", lng: 102.78, lat: 2.53, gridX: 7, gridY: 4 },
  { code: 2, name: "Jementah", region: "Segamat", lng: 102.98, lat: 2.62, gridX: 7, gridY: 5 },
  { code: 3, name: "Pemanis", region: "Sekijang", lng: 103.05, lat: 2.52, gridX: 8, gridY: 5 },
  { code: 4, name: "Kemelah", region: "Sekijang", lng: 102.98, lat: 2.37, gridX: 8, gridY: 6 },
  { code: 5, name: "Tenang", region: "Labis", lng: 102.98, lat: 2.37, gridX: 9, gridY: 5 },
  { code: 6, name: "Bekok", region: "Labis", lng: 103.12, lat: 2.43, gridX: 9, gridY: 6 },
  { code: 7, name: "Bukit Kepong", region: "Pagoh", lng: 102.75, lat: 2.44, gridX: 8, gridY: 7 },
  { code: 8, name: "Bukit Pasir", region: "Pagoh", lng: 102.87, lat: 2.38, gridX: 7, gridY: 7 },
  { code: 9, name: "Gambir", region: "Ledang", lng: 103.09, lat: 2.32, gridX: 7, gridY: 6 },
  { code: 10, name: "Tangkak", region: "Ledang", lng: 102.98, lat: 2.27, gridX: 6, gridY: 6 },
  { code: 11, name: "Serom", region: "Ledang", lng: 102.92, lat: 2.24, gridX: 6, gridY: 7 },
  { code: 12, name: "Bentayan", region: "Bakri", lng: 102.88, lat: 1.93, gridX: 5, gridY: 8 },
  { code: 13, name: "Simpang Jeram", region: "Bakri", lng: 102.88, lat: 1.95, gridX: 6, gridY: 8 },
  { code: 14, name: "Bukit Naning", region: "Bakri", lng: 102.88, lat: 2.20, gridX: 7, gridY: 8 },
  { code: 15, name: "Maharani", region: "Muar", lng: 102.77, lat: 2.05, gridX: 5, gridY: 9 },
  { code: 16, name: "Sungai Balang", region: "Muar", lng: 102.85, lat: 2.10, gridX: 6, gridY: 9 },
  { code: 17, name: "Semerah", region: "Parit Sulong", lng: 102.99, lat: 1.77, gridX: 7, gridY: 9 },
  { code: 18, name: "Sri Medan", region: "Parit Sulong", lng: 102.87, lat: 1.75, gridX: 8, gridY: 8 },
  { code: 19, name: "Yong Peng", region: "Ayer Hitam", lng: 103.07, lat: 2.00, gridX: 9, gridY: 8 },
  { code: 20, name: "Semarang", region: "Ayer Hitam", lng: 103.15, lat: 1.96, gridX: 9, gridY: 9 },
  { code: 21, name: "Parit Yaani", region: "Sri Gading", lng: 103.05, lat: 1.86, gridX: 8, gridY: 9 },
  { code: 22, name: "Parit Raja", region: "Sri Gading", lng: 103.04, lat: 1.80, gridX: 9, gridY: 10 },
  { code: 23, name: "Penggaram", region: "Batu Pahat", lng: 102.95, lat: 1.84, gridX: 8, gridY: 10 },
  { code: 24, name: "Senggarang", region: "Batu Pahat", lng: 102.97, lat: 1.87, gridX: 7, gridY: 10 },
  { code: 25, name: "Rengit", region: "Batu Pahat", lng: 102.99, lat: 1.68, gridX: 7, gridY: 11 },
  { code: 26, name: "Machap", region: "Simpang Renggam", lng: 103.18, lat: 1.85, gridX: 10, gridY: 9 },
  { code: 27, name: "Layang-Layang", region: "Simpang Renggam", lng: 103.10, lat: 1.77, gridX: 11, gridY: 9 },
  { code: 28, name: "Mengkibol", region: "Kluang", lng: 103.32, lat: 2.02, gridX: 11, gridY: 8 },
  { code: 29, name: "Mahkota", region: "Kluang", lng: 103.42, lat: 2.02, gridX: 10, gridY: 8 },
  { code: 30, name: "Paloh", region: "Sembrong", lng: 103.38, lat: 2.10, gridX: 9, gridY: 7 },
  { code: 31, name: "Kahang", region: "Sembrong", lng: 103.38, lat: 2.10, gridX: 10, gridY: 7 },
  { code: 32, name: "Endau", region: "Mersing", lng: 103.61, lat: 2.15, gridX: 10, gridY: 6 },
  { code: 33, name: "Tenggaroh", region: "Mersing", lng: 103.61, lat: 2.15, gridX: 12, gridY: 8 },
  { code: 34, name: "Panti", region: "Tenggara", lng: 103.61, lat: 2.15, gridX: 12, gridY: 9 },
  { code: 35, name: "Pasir Raja", region: "Tenggara", lng: 103.61, lat: 2.15, gridX: 12, gridY: 10 },
  { code: 36, name: "Sedili", region: "Kota Tinggi", lng: 104.10, lat: 1.95, gridX: 13, gridY: 9 },
  { code: 37, name: "Johor Lama", region: "Kota Tinggi", lng: 103.97, lat: 1.78, gridX: 13, gridY: 10 },
  { code: 38, name: "Tanjung Surat", region: "Pengerang", lng: 103.97, lat: 1.65, gridX: 12, gridY: 11 },
  { code: 39, name: "Penawar", region: "Pengerang", lng: 104.10, lat: 1.73, gridX: 13, gridY: 11 },
  { code: 40, name: "Tiram", region: "Tebrau", lng: 103.85, lat: 1.55, gridX: 11, gridY: 11 },
  { code: 41, name: "Puteri Wangsa", region: "Tebrau", lng: 103.83, lat: 1.52, gridX: 10, gridY: 11 },
  { code: 42, name: "Johor Jaya", region: "Pasir Gudang", lng: 103.78, lat: 1.52, gridX: 12, gridY: 12 },
  { code: 43, name: "Permas", region: "Pasir Gudang", lng: 103.81, lat: 1.49, gridX: 12, gridY: 13 },
  { code: 44, name: "Larkin", region: "Johor Bahru", lng: 103.73, lat: 1.50, gridX: 11, gridY: 12 },
  { code: 45, name: "Kempas", region: "Pulai", lng: 103.68, lat: 1.53, gridX: 11, gridY: 13 },
  { code: 46, name: "Stulang", region: "Johor Bahru", lng: 103.75, lat: 1.46, gridX: 10, gridY: 13 },
  { code: 47, name: "Perling", region: "Pulai", lng: 103.82, lat: 1.63, gridX: 10, gridY: 12 },
  { code: 48, name: "Skudai", region: "Iskandar Puteri", lng: 103.67, lat: 1.58, gridX: 9, gridY: 12 },
  { code: 49, name: "Kota Iskandar", region: "Iskandar Puteri", lng: 103.58, lat: 1.56, gridX: 9, gridY: 13 },
  { code: 50, name: "Bukit Permai", region: "Kulai", lng: 103.47, lat: 1.62, gridX: 11, gridY: 10 },
  { code: 51, name: "Bukit Batu", region: "Kulai", lng: 103.68, lat: 1.72, gridX: 10, gridY: 10 },
  { code: 52, name: "Senai", region: "Kulai", lng: 103.67, lat: 1.65, gridX: 9, gridY: 11 },
  { code: 53, name: "Benut", region: "Pontian", lng: 103.25, lat: 1.43, gridX: 8, gridY: 11 },
  { code: 54, name: "Pulai Sebatang", region: "Pontian", lng: 103.41, lat: 1.47, gridX: 7, gridY: 12 },
  { code: 55, name: "Pekan Nanas", region: "Tanjung Piai", lng: 103.53, lat: 1.55, gridX: 8, gridY: 12 },
  { code: 56, name: "Kukup", region: "Tanjung Piai", lng: 103.42, lat: 1.33, gridX: 8, gridY: 13 },
];

const NEGERI_SEMBILAN_DUN_SEATS: {
  name: string;
  code: number;
  region: string;
  gridX: number;
  gridY: number
}[] = [
    { code: 1, name: "Chennah", region: "Jelebu", gridX: 8, gridY: 4 },
    { code: 2, name: "Pertang", region: "Jelebu", gridX: 9, gridY: 4 },
    { code: 3, name: "Sungai Lui", region: "Jelebu", gridX: 10, gridY: 5 },
    { code: 4, name: "Klawang", region: "Jelebu", gridX: 8, gridY: 5 },
    { code: 5, name: "Serting", region: "Jempol", gridX: 11, gridY: 6 },
    { code: 6, name: "Palong", region: "Jempol", gridX: 12, gridY: 6 },
    { code: 7, name: "Jeram Padang", region: "Jempol", gridX: 11, gridY: 7 },
    { code: 8, name: "Bahau", region: "Jempol", gridX: 10, gridY: 6 },
    { code: 9, name: "Lenggeng", region: "Seremban", gridX: 7, gridY: 6 },
    { code: 10, name: "Nilai", region: "Seremban", gridX: 5, gridY: 7 },
    { code: 11, name: "Lobak", region: "Seremban", gridX: 6, gridY: 6 },
    { code: 12, name: "Temiang", region: "Seremban", gridX: 6, gridY: 7 },
    { code: 13, name: "Sikamat", region: "Seremban", gridX: 7, gridY: 7 },
    { code: 14, name: "Ampangan", region: "Seremban", gridX: 8, gridY: 7 },
    { code: 15, name: "Juasseh", region: "Kuala Pilah", gridX: 9, gridY: 5 },
    { code: 16, name: "Seri Menanti", region: "Kuala Pilah", gridX: 8, gridY: 6 },
    { code: 17, name: "Senaling", region: "Kuala Pilah", gridX: 10, gridY: 7 },
    { code: 18, name: "Pilah", region: "Kuala Pilah", gridX: 9, gridY: 6 },
    { code: 19, name: "Johol", region: "Kuala Pilah", gridX: 9, gridY: 7 },
    { code: 20, name: "Labu", region: "Rasah", gridX: 5, gridY: 8 },
    { code: 21, name: "Bukit Kepayang", region: "Rasah", gridX: 6, gridY: 8 },
    { code: 22, name: "Rahang", region: "Rasah", gridX: 7, gridY: 8 },
    { code: 23, name: "Mambau", region: "Rasah", gridX: 7, gridY: 9 },
    { code: 24, name: "Seremban Jaya", region: "Rasah", gridX: 8, gridY: 8 },
    { code: 25, name: "Paroi", region: "Rembau", gridX: 9, gridY: 8 },
    { code: 26, name: "Chembong", region: "Rembau", gridX: 10, gridY: 8 },
    { code: 27, name: "Rantau", region: "Rembau", gridX: 8, gridY: 9 },
    { code: 28, name: "Kota", region: "Rembau", gridX: 9, gridY: 9 },
    { code: 29, name: "Chuah", region: "Port Dickson", gridX: 5, gridY: 9 },
    { code: 30, name: "Lukut", region: "Port Dickson", gridX: 6, gridY: 9 },
    { code: 31, name: "Bagan Pinang", region: "Port Dickson", gridX: 7, gridY: 10 },
    { code: 32, name: "Linggi", region: "Port Dickson", gridX: 8, gridY: 10 },
    { code: 33, name: "Sri Tanjung", region: "Port Dickson", gridX: 6, gridY: 19 },
    { code: 34, name: "Gemas", region: "Tampin", gridX: 11, gridY: 8 },
    { code: 35, name: "Gemencheh", region: "Tampin", gridX: 11, gridY: 9 },
    { code: 36, name: "Repah", region: "Tampin", gridX: 10, gridY: 9 },
  ];
/*
const SELANGOR_DUN_SEATS = [
  { name: "Sungai Air Tawar", code: "N01", region: "Sabak Bernam" },
  { name: "Sabak", code: "N02", region: "Sabak Bernam" },
  { name: "Sungai Panjang", code: "N03", region: "Sungai Besar" },
  { name: "Sekinchan", code: "N04", region: "Sungai Besar" },
  { name: "Hulu Bernam", code: "N05", region: "Hulu Selangor" },
  { name: "Kuala Kubu Baharu", code: "N06", region: "Hulu Selangor" },
  { name: "Batang Kali", code: "N07", region: "Hulu Selangor" },
  { name: "Sungai Burong", code: "N08", region: "Tanjong Karang" },
  { name: "Permatang", code: "N09", region: "Tanjong Karang" },
  { name: "Bukit Melawati", code: "N10", region: "Kuala Selangor" },
  { name: "Ijok", code: "N11", region: "Kuala Selangor" },
  { name: "Jeram", code: "N12", region: "Kuala Selangor" },
  { name: "Kuang", code: "N13", region: "Selayang" },
  { name: "Rawang", code: "N14", region: "Selayang" },
  { name: "Taman Templer", code: "N15", region: "Selayang" },
  { name: "Sungai Tua", code: "N16", region: "Gombak" },
  { name: "Gombak Setia", code: "N17", region: "Gombak" },
  { name: "Hulu Kelang", code: "N18", region: "Gombak" },
  { name: "Bukit Antarabangsa", code: "N19", region: "Ampang" },
  { name: "Lembah Jaya", code: "N20", region: "Ampang" },
  { name: "Pandan Indah", code: "N21", region: "Pandan" },
  { name: "Teratai", code: "N22", region: "Pandan" },
  { name: "Dusun Tua", code: "N23", region: "Hulu Langat" },
  { name: "Semenyih", code: "N24", region: "Hulu Langat" },
  { name: "Kajang", code: "N25", region: "Bangi" },
  { name: "Sungai Ramal", code: "N26", region: "Bangi" },
  { name: "Balakong", code: "N27", region: "Bangi" },
  { name: "Seri Kembangan", code: "N28", region: "Puchong" },
  { name: "Seri Serdang", code: "N29", region: "Puchong" },
  { name: "Kinrara", code: "N30", region: "Subang" },
  { name: "Subang Jaya", code: "N31", region: "Subang" },
  { name: "Seri Setia", code: "N32", region: "Petaling Jaya" },
  { name: "Taman Medan", code: "N33", region: "Petaling Jaya" },
  { name: "Bukit Gasing", code: "N34", region: "Petaling Jaya" },
  { name: "Kampung Tunku", code: "N35", region: "Damansara" },
  { name: "Bandar Utama", code: "N36", region: "Damansara" },
  { name: "Bukit Lanjan", code: "N37", region: "Damansara" },
  { name: "Paya Jaras", code: "N38", region: "Sungai Buloh" },
  { name: "Kota Damansara", code: "N39", region: "Sungai Buloh" },
  { name: "Kota Anggerik", code: "N40", region: "Shah Alam" },
  { name: "Batu Tiga", code: "N41", region: "Shah Alam" },
  { name: "Meru", code: "N42", region: "Kapar" },
  { name: "Sementa", code: "N43", region: "Kapar" },
  { name: "Selat Klang", code: "N44", region: "Kapar" },
  { name: "Bandar Baru Klang", code: "N45", region: "Klang" },
  { name: "Pelabuhan Klang", code: "N46", region: "Klang" },
  { name: "Pandamaran", code: "N47", region: "Klang" },
  { name: "Sentosa", code: "N48", region: "Kota Raja" },
  { name: "Sungai Kandis", code: "N49", region: "Kota Raja" },
  { name: "Kota Kemuning", code: "N50", region: "Kota Raja" },
  { name: "Sijangkang", code: "N51", region: "Kuala Langat" },
  { name: "Banting", code: "N52", region: "Kuala Langat" },
  { name: "Morib", code: "N53", region: "Kuala Langat" },
  { name: "Tanjong Sepat", code: "N54", region: "Sepang" },
  { name: "Dengkil", code: "N55", region: "Sepang" },
  { name: "Sungai Pelek", code: "N56", region: "Sepang" },
];

const PENANG_DUN_SEATS = [
  { name: "Penaga", region: "Seberang Perai Utara", lng: 100.38, lat: 5.53 },
  { name: "Pinang Tunggal", region: "Seberang Perai Utara", lng: 100.50, lat: 5.54 },
  { name: "Bertam", region: "Seberang Perai Utara", lng: 100.44, lat: 5.52 },
  { name: "Sungai Dua", region: "Seberang Perai Utara", lng: 100.43, lat: 5.45 },
  { name: "Kepala Batas Town", region: "Seberang Perai Utara", lng: 100.42, lat: 5.51 },
  { name: "Bagan Jermal", region: "Seberang Perai Utara", lng: 100.38, lat: 5.43 },
  { name: "Bagan Dalam", region: "Seberang Perai Utara", lng: 100.37, lat: 5.40 },
  { name: "Perai", region: "Seberang Perai Tengah", lng: 100.38, lat: 5.38 },
  { name: "Bukit Tengah", region: "Seberang Perai Tengah", lng: 100.42, lat: 5.35 },
  { name: "Bukit Mertajam Central", region: "Seberang Perai Tengah", lng: 100.46, lat: 5.36 },
  { name: "Batu Kawan Industrial", region: "Seberang Perai Selatan", lng: 100.43, lat: 5.27 },
  { name: "Sungai Bakap", region: "Seberang Perai Selatan", lng: 100.49, lat: 5.22 },
  { name: "Jawi", region: "Seberang Perai Selatan", lng: 100.49, lat: 5.20 },
  { name: "Nibong Tebal", region: "Seberang Perai Selatan", lng: 100.48, lat: 5.17 },
  { name: "Air Putih", region: "Penang Island", lng: 100.27, lat: 5.40 },
  { name: "Kebun Bunga", region: "Penang Island", lng: 100.29, lat: 5.43 },
  { name: "Pulau Tikus", region: "Penang Island", lng: 100.31, lat: 5.43 },
  { name: "Padang Kota", region: "Penang Island", lng: 100.34, lat: 5.42 },
  { name: "Pengkalan Kota", region: "Penang Island", lng: 100.34, lat: 5.41 },
  { name: "Komtar", region: "Penang Island", lng: 100.33, lat: 5.41 },
  { name: "Datok Keramat", region: "Penang Island", lng: 100.31, lat: 5.41 },
  { name: "Sungai Pinang", region: "Penang Island", lng: 100.31, lat: 5.40 },
  { name: "Batu Lancang", region: "Penang Island", lng: 100.30, lat: 5.39 },
  { name: "Seri Delima", region: "Penang Island", lng: 100.30, lat: 5.38 },
  { name: "Air Itam", region: "Penang Island", lng: 100.28, lat: 5.40 },
  { name: "Paya Terubong", region: "Penang Island", lng: 100.27, lat: 5.39 },
  { name: "Batu Uban", region: "Penang Island", lng: 100.30, lat: 5.35 },
  { name: "Bayan Lepas", region: "Penang Island", lng: 100.26, lat: 5.29 },
  { name: "Pantai Jerejak", region: "Penang Island", lng: 100.30, lat: 5.33 },
  { name: "Batu Maung", region: "Penang Island", lng: 100.28, lat: 5.28 },
  { name: "Tanjung Bungah", region: "Penang Island", lng: 100.28, lat: 5.46 },
  { name: "Telok Bahang", region: "Penang Island", lng: 100.21, lat: 5.45 },
];
*/
const FEDERAL_SEATS = [
  { name: "P.001 Padang Besar", region: "Perlis", lng: 100.22, lat: 6.66 },
  { name: "P.002 Kangar", region: "Perlis", lng: 100.19, lat: 6.43 },
  { name: "P.003 Arau", region: "Perlis", lng: 100.27, lat: 6.42 },
  { name: "P.004 Langkawi", region: "Kedah", lng: 99.78, lat: 6.35 },
  { name: "P.005 Jerlun", region: "Kedah", lng: 100.27, lat: 6.25 },
  { name: "P.006 Kubang Pasu", region: "Kedah", lng: 100.42, lat: 6.26 },
  { name: "P.007 Padang Terap", region: "Kedah", lng: 100.68, lat: 6.25 },
  { name: "P.008 Pokok Sena", region: "Kedah", lng: 100.52, lat: 6.16 },
  { name: "P.009 Alor Setar", region: "Kedah", lng: 100.36, lat: 6.12 },
  { name: "P.010 Kuala Kedah", region: "Kedah", lng: 100.29, lat: 6.10 },
  { name: "P.011 Pendang", region: "Kedah", lng: 100.47, lat: 5.99 },
  { name: "P.012 Jerai", region: "Kedah", lng: 100.37, lat: 5.81 },
  { name: "P.013 Sik", region: "Kedah", lng: 100.74, lat: 5.82 },
  { name: "P.014 Merbok", region: "Kedah", lng: 100.47, lat: 5.72 },
  { name: "P.015 Sungai Petani", region: "Kedah", lng: 100.50, lat: 5.64 },
  { name: "P.016 Baling", region: "Kedah", lng: 100.91, lat: 5.67 },
  { name: "P.017 Padang Serai", region: "Kedah", lng: 100.55, lat: 5.51 },
  { name: "P.018 Kulim-Bandar Baharu", region: "Kedah", lng: 100.55, lat: 5.34 },
  { name: "P.019 Tumpat", region: "Kelantan", lng: 102.16, lat: 6.16 },
  { name: "P.020 Pengkalan Chepa", region: "Kelantan", lng: 102.28, lat: 6.13 },
  { name: "P.021 Kota Bharu", region: "Kelantan", lng: 102.24, lat: 6.10 },
  { name: "P.022 Pasir Mas", region: "Kelantan", lng: 102.14, lat: 6.04 },
  { name: "P.023 Rantau Panjang", region: "Kelantan", lng: 101.97, lat: 6.01 },
  { name: "P.024 Kubang Kerian", region: "Kelantan", lng: 102.27, lat: 6.08 },
  { name: "P.025 Bachok", region: "Kelantan", lng: 102.39, lat: 6.04 },
  { name: "P.026 Ketereh", region: "Kelantan", lng: 102.25, lat: 5.96 },
  { name: "P.027 Tanah Merah", region: "Kelantan", lng: 102.14, lat: 5.80 },
  { name: "P.028 Pasir Puteh", region: "Kelantan", lng: 102.40, lat: 5.83 },
  { name: "P.029 Machang", region: "Kelantan", lng: 102.21, lat: 5.76 },
  { name: "P.030 Jeli", region: "Kelantan", lng: 101.84, lat: 5.69 },
  { name: "P.031 Kuala Krai", region: "Kelantan", lng: 102.20, lat: 5.53 },
  { name: "P.032 Gua Musang", region: "Kelantan", lng: 101.96, lat: 4.88 },
  { name: "P.033 Besut", region: "Terengganu", lng: 102.55, lat: 5.73 },
  { name: "P.034 Setiu", region: "Terengganu", lng: 102.72, lat: 5.50 },
  { name: "P.035 Kuala Nerus", region: "Terengganu", lng: 103.07, lat: 5.37 },
  { name: "P.036 Kuala Terengganu", region: "Terengganu", lng: 103.11, lat: 5.30 },
  { name: "P.037 Marang", region: "Terengganu", lng: 103.12, lat: 5.17 },
  { name: "P.038 Hulu Terengganu", region: "Terengganu", lng: 102.88, lat: 5.03 },
  { name: "P.039 Dungun", region: "Terengganu", lng: 103.22, lat: 4.70 },
  { name: "P.040 Kemaman", region: "Terengganu", lng: 103.29, lat: 4.25 },
  { name: "P.041 Kepala Batas", region: "Pulau Pinang", lng: 100.43, lat: 5.51 },
  { name: "P.042 Tasek Gelugor", region: "Pulau Pinang", lng: 100.48, lat: 5.48 },
  { name: "P.043 Bagan", region: "Pulau Pinang", lng: 100.38, lat: 5.43 },
  { name: "P.044 Permatang Pauh", region: "Pulau Pinang", lng: 100.41, lat: 5.37 },
  { name: "P.045 Bukit Mertajam", region: "Pulau Pinang", lng: 100.46, lat: 5.36 },
  { name: "P.046 Batu Kawan", region: "Pulau Pinang", lng: 100.41, lat: 5.27 },
  { name: "P.047 Nibong Tebal", region: "Pulau Pinang", lng: 100.48, lat: 5.17 },
  { name: "P.048 Bukit Bendera", region: "Pulau Pinang", lng: 100.27, lat: 5.42 },
  { name: "P.049 Tanjong", region: "Pulau Pinang", lng: 100.33, lat: 5.41 },
  { name: "P.050 Jelutong", region: "Pulau Pinang", lng: 100.31, lat: 5.39 },
  { name: "P.051 Bukit Gelugor", region: "Pulau Pinang", lng: 100.30, lat: 5.36 },
  { name: "P.052 Bayan Baru", region: "Pulau Pinang", lng: 100.28, lat: 5.32 },
  { name: "P.053 Balik Pulau", region: "Pulau Pinang", lng: 100.21, lat: 5.35 },
  { name: "P.092 Sabak Bernam", region: "Selangor", lng: 100.98, lat: 3.77 },
  { name: "P.093 Sungai Besar", region: "Selangor", lng: 101.00, lat: 3.65 },
  { name: "P.094 Hulu Selangor", region: "Selangor", lng: 101.55, lat: 3.56 },
  { name: "P.095 Kuala Selangor", region: "Selangor", lng: 101.25, lat: 3.33 },
  { name: "P.096 Kuala Langat", region: "Selangor", lng: 101.47, lat: 2.81 },
  { name: "P.097 Selayang", region: "Selangor", lng: 101.65, lat: 3.25 },
  { name: "P.098 Gombak", region: "Selangor", lng: 101.71, lat: 3.24 },
  { name: "P.099 Ampang", region: "Selangor", lng: 101.76, lat: 3.15 },
  { name: "P.100 Pandan", region: "Selangor", lng: 101.75, lat: 3.13 },
  { name: "P.101 Hulu Langat", region: "Selangor", lng: 101.83, lat: 3.12 },
  { name: "P.102 Bangi", region: "Selangor", lng: 101.76, lat: 3.01 },
  { name: "P.103 Puchong", region: "Selangor", lng: 101.62, lat: 3.02 },
  { name: "P.104 Subang", region: "Selangor", lng: 101.59, lat: 3.06 },
  { name: "P.105 Petaling Jaya", region: "Selangor", lng: 101.64, lat: 3.10 },
  { name: "P.106 Damansara", region: "Selangor", lng: 101.60, lat: 3.13 },
  { name: "P.107 Sungai Buloh", region: "Selangor", lng: 101.55, lat: 3.20 },
  { name: "P.108 Shah Alam", region: "Selangor", lng: 101.53, lat: 3.08 },
  { name: "P.109 Kapar", region: "Selangor", lng: 101.39, lat: 3.09 },
  { name: "P.110 Klang", region: "Selangor", lng: 101.44, lat: 3.03 },
  { name: "P.111 Kota Raja", region: "Selangor", lng: 101.52, lat: 3.00 },
  { name: "P.113 Sepang", region: "Selangor", lng: 101.71, lat: 2.75 },
  { name: "P.114 Kepong", region: "Kuala Lumpur", lng: 101.64, lat: 3.21 },
  { name: "P.115 Batu", region: "Kuala Lumpur", lng: 101.68, lat: 3.20 },
  { name: "P.116 Wangsa Maju", region: "Kuala Lumpur", lng: 101.73, lat: 3.20 },
  { name: "P.117 Segambut", region: "Kuala Lumpur", lng: 101.65, lat: 3.17 },
  { name: "P.118 Setiawangsa", region: "Kuala Lumpur", lng: 101.74, lat: 3.18 },
  { name: "P.119 Titiwangsa", region: "Kuala Lumpur", lng: 101.71, lat: 3.16 },
  { name: "P.120 Bukit Bintang", region: "Kuala Lumpur", lng: 101.71, lat: 3.14 },
  { name: "P.121 Lembah Pantai", region: "Kuala Lumpur", lng: 101.66, lat: 3.12 },
  { name: "P.122 Seputeh", region: "Kuala Lumpur", lng: 101.68, lat: 3.08 },
  { name: "P.123 Cheras", region: "Kuala Lumpur", lng: 101.72, lat: 3.11 },
  { name: "P.124 Bandar Tun Razak", region: "Kuala Lumpur", lng: 101.72, lat: 3.08 },
  { name: "P.125 Putrajaya", region: "Putrajaya", lng: 101.69, lat: 2.92 },
  { name: "P.140 Segamat", region: "Johor", lng: 102.82, lat: 2.50 },
  { name: "P.141 Sekijang", region: "Johor", lng: 102.90, lat: 2.51 },
  { name: "P.142 Labis", region: "Johor", lng: 103.02, lat: 2.38 },
  { name: "P.143 Pagoh", region: "Johor", lng: 102.77, lat: 2.15 },
  { name: "P.144 Ledang", region: "Johor", lng: 102.66, lat: 2.27 },
  { name: "P.145 Bakri", region: "Johor", lng: 102.58, lat: 2.04 },
  { name: "P.146 Muar", region: "Johor", lng: 102.57, lat: 1.95 },
  { name: "P.147 Parit Sulong", region: "Johor", lng: 102.87, lat: 1.98 },
  { name: "P.148 Ayer Hitam", region: "Johor", lng: 103.18, lat: 1.92 },
  { name: "P.149 Sri Gading", region: "Johor", lng: 103.03, lat: 1.83 },
  { name: "P.150 Batu Pahat", region: "Johor", lng: 102.93, lat: 1.85 },
  { name: "P.151 Simpang Renggam", region: "Johor", lng: 103.30, lat: 1.83 },
  { name: "P.152 Kluang", region: "Johor", lng: 103.32, lat: 2.03 },
  { name: "P.153 Sembrong", region: "Johor", lng: 103.62, lat: 2.04 },
  { name: "P.154 Mersing", region: "Johor", lng: 103.83, lat: 2.43 },
  { name: "P.155 Tenggara", region: "Johor", lng: 103.73, lat: 1.85 },
  { name: "P.156 Kota Tinggi", region: "Johor", lng: 103.90, lat: 1.73 },
  { name: "P.157 Pengerang", region: "Johor", lng: 104.22, lat: 1.37 },
  { name: "P.158 Tebrau", region: "Johor", lng: 103.80, lat: 1.57 },
  { name: "P.159 Pasir Gudang", region: "Johor", lng: 103.90, lat: 1.47 },
  { name: "P.160 Johor Bahru", region: "Johor", lng: 103.76, lat: 1.46 },
  { name: "P.161 Pulai", region: "Johor", lng: 103.70, lat: 1.49 },
  { name: "P.162 Iskandar Puteri", region: "Johor", lng: 103.65, lat: 1.43 },
  { name: "P.163 Kulai", region: "Johor", lng: 103.60, lat: 1.66 },
  { name: "P.164 Pontian", region: "Johor", lng: 103.39, lat: 1.49 },
  { name: "P.165 Tanjung Piai", region: "Johor", lng: 103.48, lat: 1.27 },
];

async function seed() {
  console.log("Seeding database...");

  // Clear existing data in child-to-parent order to avoid foreign key violations
  await db.delete(candidateVotesTable);
  await db.delete(constituencyResultsTable);
  await db.delete(candidatesTable);
  await db.delete(constituenciesTable);
  await db.delete(electionsTable);
  await db.delete(partiesTable);

  // 1. Insert parties
  const partyMap = new Map<string, number>();
  for (const party of PARTIES) {
    const [inserted] = await db.insert(partiesTable).values(party).returning();
    partyMap.set(party.abbreviation, inserted.id);
  }
  console.log("Seeded parties.");

  // 2. Insert constituencies (clear existing done above)

  const constMap = new Map<string, number>();

  // Johor DUN
  for (const c of JOHOR_DUN_SEATS) {
    const codeStr = `N${String(c.code).padStart(2, "0")}`;
    const [inserted] = await db
      .insert(constituenciesTable)
      .values({
        name: c.name,
        code: codeStr,
        region: c.region,
        latitude: c.lat,
        longitude: c.lng,
        gridX: c.gridX,
        gridY: c.gridY,
        scope: "state",
        state: "Johor"
      })
      .returning();
    constMap.set(`state_Johor_${c.name}`, inserted.id);
  }

  // Negeri Sembilan DUN
  for (const c of NEGERI_SEMBILAN_DUN_SEATS) {
    const codeStr = `N${String(c.code).padStart(2, "0")}`;
    const [inserted] = await db
      .insert(constituenciesTable)
      .values({
        name: c.name,
        code: codeStr,
        region: c.region,
        gridX: c.gridX,
        gridY: c.gridY,
        scope: "state",
        state: "Negeri Sembilan"
      })
      .returning();
    constMap.set(`state_Negeri Sembilan_${c.name}`, inserted.id);
  }
  /*
    // Selangor DUN
    for (const c of SELANGOR_DUN_SEATS) {
      const lat = "lat" in c ? (c as any).lat : 3.08;
      const lng = "lng" in c ? (c as any).lng : 101.53;
      const codeStr = c.code;
      const [inserted] = await db
        .insert(constituenciesTable)
        .values({ name: c.name, code: codeStr, region: c.region, latitude: lat, longitude: lng, scope: "state", state: "Selangor" })
        .returning();
      constMap.set(`state_Selangor_${c.name}`, inserted.id);
    }
  
    // Penang DUN
    for (let i = 0; i < PENANG_DUN_SEATS.length; i++) {
      const c = PENANG_DUN_SEATS[i];
      const codeStr = `N${String(i + 1).padStart(2, "0")}`;
      const [inserted] = await db
        .insert(constituenciesTable)
        .values({ name: c.name, code: codeStr, region: c.region, latitude: c.lat, longitude: c.lng, scope: "state", state: "Penang" })
        .returning();
      constMap.set(`state_Penang_${c.name}`, inserted.id);
    }
      */

  // Federal Kawasan
  for (const c of FEDERAL_SEATS) {
    const codeStr = c.name.split(" ")[0]; // Extracts "P.XXX"
    const [inserted] = await db
      .insert(constituenciesTable)
      .values({ name: c.name, code: codeStr, region: c.region, latitude: c.lat, longitude: c.lng, scope: "federal", state: c.region })
      .returning();
    constMap.set(`federal__${c.name}`, inserted.id);
  }
  console.log(`Seeded ${constMap.size} constituencies.`);

  // 3. Clear existing elections & dependencies
  await db.delete(candidateVotesTable);
  await db.delete(candidatesTable);
  await db.delete(constituencyResultsTable);
  await db.delete(electionsTable);

  // 4. Create Elections
  /*
  
  const [ge15] = await db
    .insert(electionsTable)
    .values({
      name: "GE15 (Federal Parliament)",
      date: "2022-11-19",
      totalSeats: FEDERAL_SEATS.length,
      scope: "federal",
      status: "declared",
    })
    .returning();

  const [johor22] = await db
    .insert(electionsTable)
    .values({
      name: "Johor State Election 2022",
      date: "2022-03-12",
      totalSeats: JOHOR_DUN_SEATS.length,
      scope: "state",
      state: "Johor",
      status: "declared",
    })
    .returning();

  const [selangor23] = await db
    .insert(electionsTable)
    .values({
      name: "Selangor State Election 2023",
      date: "2023-08-12",
      totalSeats: SELANGOR_DUN_SEATS.length,
      scope: "state",
      state: "Selangor",
      status: "declared",
    })
    .returning();

  const [penang23] = await db
    .insert(electionsTable)
    .values({
      name: "Penang State Election 2023",
      date: "2023-08-12",
      totalSeats: PENANG_DUN_SEATS.length,
      scope: "state",
      state: "Penang",
      status: "declared",
    })
    .returning();

  const [negeri23] = await db
    .insert(electionsTable)
    .values({
      name: "Negeri Sembilan State Election 2023",
      date: "2023-08-12",
      totalSeats: NEGERI_SEMBILAN_DUN_SEATS.length,
      scope: "state",
      state: "Negeri Sembilan",
      status: "declared",
    })
    .returning();

  console.log("Seeded elections.");

  // Helper to seed results
  async function seedElectionResults(
    electionId: number,
    electionScope: string,
    electionState: string | null,
    constList: { name: string }[],
    partyPool: string[]
  ) {
    for (const c of constList) {
      const lookupKey = electionScope === "federal" ? `federal__${c.name}` : `state_${electionState}_${c.name}`;
      const constituencyId = constMap.get(lookupKey);
      if (!constituencyId) continue;

      const registered = Math.floor(Math.random() * 30000) + 15000;
      const turnout = Math.floor(Math.random() * 20) + 65; // 65% - 85%
      const votesCast = Math.floor((registered * turnout) / 100);

      // Create constituency result row
      await db.insert(constituencyResultsTable).values({
        electionId,
        constituencyId,
        registeredVoters: registered,
        votesCast,
        status: "declared",
      });

      // Distribute votes among 2 or 3 parties randomly
      const shuffledParties = [...partyPool].sort(() => 0.5 - Math.random());
      const numCand = Math.floor(Math.random() * 2) + 2; // 2 or 3 candidates
      const candParties = shuffledParties.slice(0, numCand);

      let remainingVotes = votesCast;
      const candidatesToInsert: { name: string; partyId: number; votes: number; isWinner: boolean }[] = [];

      for (let i = 0; i < numCand; i++) {
        const pAbbr = candParties[i];
        const partyId = partyMap.get(pAbbr) || 6; // default IND

        let votes = 0;
        if (i === numCand - 1) {
          votes = remainingVotes;
        } else {
          // Give winner/first one a solid share
          const factor = i === 0 ? 0.45 + Math.random() * 0.15 : (1 - i / numCand) * 0.3;
          votes = Math.floor(votesCast * factor);
          remainingVotes -= votes;
        }
        if (votes < 0) votes = 0;

        candidatesToInsert.push({
          name: `Candidate ${pAbbr} - ${c.name}`,
          partyId,
          votes,
          isWinner: false,
        });
      }

      // Sort and set winner
      candidatesToInsert.sort((a, b) => b.votes - a.votes);
      candidatesToInsert[0].isWinner = true;

      // Insert candidates and votes
      for (const cand of candidatesToInsert) {
        const [insertedCand] = await db
          .insert(candidatesTable)
          .values({
            name: cand.name,
            partyId: cand.partyId,
            constituencyId,
            electionId,
          })
          .returning();

        await db.insert(candidateVotesTable).values({
          electionId,
          candidateId: insertedCand.id,
          constituencyId,
          votes: cand.votes,
          isWinner: cand.isWinner ? 1 : 0,
        });
      }
    }
  }

  // Seed results for GE15 (federal)
  console.log("Seeding GE15 results...");
  await seedElectionResults(ge15.id, "federal", null, FEDERAL_SEATS, ["PH", "PN", "BN", "GPS", "GRS"]);

  // Seed results for Johor 2022 (state)
  console.log("Seeding Johor 2022 results...");
  await seedElectionResults(johor22.id, "state", "Johor", JOHOR_DUN_SEATS, ["BN", "PH", "PN", "IND"]);

  // Seed results for Selangor 2023 (state)
  console.log("Seeding Selangor 2023 results...");
  await seedElectionResults(selangor23.id, "state", "Selangor", SELANGOR_DUN_SEATS, ["PH", "PN", "BN"]);

  // Seed results for Penang 2023 (state)
  console.log("Seeding Penang 2023 results...");
  await seedElectionResults(penang23.id, "state", "Penang", PENANG_DUN_SEATS, ["PH", "PN", "BN"]);

  // Seed results for Negeri Sembilan 2023 (state)
  console.log("Seeding Negeri Sembilan 2023 results...");
  await seedElectionResults(negeri23.id, "state", "Negeri Sembilan", NEGERI_SEMBILAN_DUN_SEATS, ["PH", "PN", "BN"]);
  */
  console.log("Seeding completed successfully!");

}

seed()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    pool.end();
    process.exit(1);
  });
