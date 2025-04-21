import { tmdbAuthToken } from "../config";


export const tmdbOptions = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: tmdbAuthToken,
    },
  };
  