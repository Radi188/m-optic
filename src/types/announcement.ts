export interface AnnouncementResponse {
  total: number;
  data: AnnouncementItem[];
}

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  banner_image: string | null;
  link_url: string | null;
  link_text: string | null;
  is_featured: boolean;
  created_at: string;
  scheduled_at: string | null;
}