import axios from "axios";

export const searchSongs = async (
  query: string
) => {
  try {
    const response = await axios.get(
      `http://localhost:5000/search?q=${query}`
    );

    return response.data;

  } catch (error) {
    console.log(error);

    return [];
  }
};