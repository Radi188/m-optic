import api from '../services/api';
import { AnnouncementResponse } from '../types/announcement';

export const announcementController = {
  /**
   * Fetch all announcements
   */
  async getAnnouncements(): Promise<AnnouncementResponse> {
    const response = await api.get<AnnouncementResponse>('/announcements');
    return response.data;
  },

  /**
   * Fetch a single announcement by ID
   */
  async getAnnouncementById(id: number): Promise<AnnouncementResponse> {
    const response = await api.get<AnnouncementResponse>(`/announcements/${id}`);
    return response.data;
  },
};