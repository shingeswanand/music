import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const searchSongs = async (query: string) => {
  try {
    const response = await axios.get(
      `${API_URL.replace(/\/$/, "")}/search?q=${query}`
    );

    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
};