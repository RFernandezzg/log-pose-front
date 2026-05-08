export interface CommunityEvent {
  id: number;
  name: string;
  description: string;
  dateTime: string;
  location: string;
  maxAttendees: number;
  latitude?: number;
  longitude?: number;
  creator: Creator;
  attendees: Attendee[];
  attendeeCount: number;
}

export interface Creator {
  id: number;
  username: string;
  avatarUrl: string;
}

export interface Attendee {
  id: number;
  username: string;
  avatarUrl: string;
}

export interface EventRequest {
  name: string;
  description: string;
  dateTime: string;
  location: string;
  maxAttendees: number;
  latitude: number;
  longitude: number;
}
