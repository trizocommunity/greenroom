export interface MockSession {
  id: string;
  title: string;
  category: string;
  time: string;
  venue: string;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
}

export interface MockResult {
  id: string;
  programName: string;
  category: string;
  winner: string;
  team: string;
  position: 1 | 2 | 3;
  points: number;
}

export const MOCK_SESSIONS: MockSession[] = [
  {
    id: "1",
    title: "Classical Solo (Junior)",
    category: "Music",
    time: "09:00 AM",
    venue: "Main Auditorium",
    status: "LIVE",
  },
  {
    id: "2",
    title: "Mime (Group)",
    category: "Theatre",
    time: "10:30 AM",
    venue: "Block B Hall",
    status: "UPCOMING",
  },
  {
    id: "3",
    title: "Folk Dance (Senior)",
    category: "Dance",
    time: "02:00 PM",
    venue: "Open Air Stage",
    status: "UPCOMING",
  },
  {
    id: "4",
    title: "Watercolor Painting",
    category: "Fine Arts",
    time: "11:00 AM",
    venue: "Art Gallery",
    status: "COMPLETED",
  },
  {
    id: "5",
    title: "Elocution (Sub-Junior)",
    category: "Literary",
    time: "04:00 PM",
    venue: "Seminar Hall",
    status: "UPCOMING",
  },
];

export const MOCK_RESULTS: MockResult[] = [
  {
    id: "r1",
    programName: "Classical Solo (Senior)",
    category: "Music",
    winner: "Sarah Jenkins",
    team: "Red House",
    position: 1,
    points: 10,
  },
  {
    id: "r2",
    programName: "Classical Solo (Senior)",
    category: "Music",
    winner: "David Chen",
    team: "Blue House",
    position: 2,
    points: 7,
  },
  {
    id: "r3",
    programName: "Classical Solo (Senior)",
    category: "Music",
    winner: "Maria Garcia",
    team: "Green House",
    position: 3,
    points: 5,
  },
  {
    id: "r4",
    programName: "Group Dance",
    category: "Dance",
    winner: "The Dynamix",
    team: "Yellow House",
    position: 1,
    points: 15,
  },
];

// Using placeholder images for now
export const MOCK_GALLERY = [
  "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1514525253440-b393452e8d26?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1459749411177-287ce371c045?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
];
