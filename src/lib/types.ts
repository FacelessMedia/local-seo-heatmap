export interface Project {
  id: string;
  businessName: string;
  placeId?: string;
  address?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  createdAt: string;
}

export interface Keyword {
  id: string;
  projectId: string;
  keyword: string;
  gridSize: number;
  gridSpacing: number;
  scanFrequency: string;
  isActive: boolean;
  createdAt: string;
}

export interface Scan {
  id: string;
  keywordId: string;
  projectId: string;
  keyword: string;
  status: "pending" | "running" | "completed" | "failed";
  gridSize: number;
  gridSpacing: number;
  averageRank: number | null;
  totalPoints: number;
  pointsRanked: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ScanResult {
  id: string;
  scanId: string;
  gridRow: number;
  gridCol: number;
  latitude: number;
  longitude: number;
  rank: number | null;
  topResults: ScanTopResult[];
}

export interface ScanTopResult {
  place_id: string;
  title: string;
  rank: number;
  rating?: number;
  reviews?: number;
  address?: string;
  category?: string;
}

export interface Competitor {
  id: string;
  projectId: string;
  businessName: string;
  placeId?: string;
}

export interface ScanFormData {
  keyword: string;
  gridSize: number;
  gridSpacing: number;
}

export type GridSize = 5 | 7 | 9 | 13;

export const GRID_SIZES: { value: GridSize; label: string; points: number }[] = [
  { value: 5, label: "5×5", points: 25 },
  { value: 7, label: "7×7", points: 49 },
  { value: 9, label: "9×9", points: 81 },
  { value: 13, label: "13×13", points: 169 },
];

export const GRID_SPACINGS: { value: number; label: string }[] = [
  { value: 402, label: "0.25 mi" },
  { value: 805, label: "0.5 mi" },
  { value: 1609, label: "1 mi" },
  { value: 2414, label: "1.5 mi" },
  { value: 3219, label: "2 mi" },
  { value: 4828, label: "3 mi" },
  { value: 8047, label: "5 mi" },
];
