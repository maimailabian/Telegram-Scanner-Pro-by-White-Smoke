
import { GoogleGenAI, Type } from "@google/genai";
import { TelegramMember } from "../types";

export const simulateScan = async (
  groupName: string, 
  options: { recentlyJoined: boolean, recentlyActive: boolean, messagedInGroup: boolean }
): Promise<TelegramMember[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a list of 25 realistic Telegram members for a group named "${groupName}". 
                 Criteria context: 
                 - Recently Joined (within 60 days): ${options.recentlyJoined}
                 - Recently Active (messaged or reacted): ${options.recentlyActive || options.messagedInGroup}
                 
                 Return as a JSON array of members. 
                 Include: 
                 - firstName, lastName (Must provide realistic Vietnamese names)
                 - joinDate (ISO string)
                 - hasReacted (boolean), hasMessaged (boolean)
                 - isPublicPhone (boolean)
                 - avatarUrl (A realistic face image URL from Unsplash/Pravatar or null)
                 - phoneNumber (format: start with "0", e.g. "0912345678", 10 digits total).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              username: { type: Type.STRING },
              firstName: { type: Type.STRING },
              lastName: { type: Type.STRING },
              phoneNumber: { type: Type.STRING },
              isPublicPhone: { type: Type.BOOLEAN },
              lastSeen: { type: Type.STRING },
              joinDate: { type: Type.STRING },
              hasReacted: { type: Type.BOOLEAN },
              hasMessaged: { type: Type.BOOLEAN },
              avatarUrl: { type: Type.STRING }
            },
            required: ["id", "username", "firstName", "lastName", "isPublicPhone", "joinDate", "hasReacted", "hasMessaged"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Simulation Error:", error);
    // Fallback if API fails, generate 25 local items
    return Array.from({ length: 25 }).map((_, i) => ({
      id: `user_${i}_${Date.now()}_${Math.random()}`,
      username: `tg_user_${i}_${Math.floor(Math.random()*100)}`,
      firstName: ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng'][Math.floor(Math.random() * 8)],
      lastName: ['Văn Anh', 'Thị Bình', 'Minh Tuấn', 'Quốc Bảo', 'Hữu Thắng', 'Mai Chi', 'Thanh Tùng', 'Thúy Hạnh'][Math.floor(Math.random() * 8)],
      isPublicPhone: Math.random() > 0.6,
      phoneNumber: Math.random() > 0.6 ? `0${Math.floor(Math.random() * 20000000 + 700000000)}` : undefined,
      lastSeen: 'Vừa xong',
      joinDate: new Date(Date.now() - Math.random() * 100 * 24 * 60 * 60 * 1000).toISOString(),
      hasReacted: Math.random() > 0.5,
      hasMessaged: Math.random() > 0.5,
      avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}`
    }));
  }
};
