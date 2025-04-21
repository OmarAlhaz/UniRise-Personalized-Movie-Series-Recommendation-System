import { create } from "zustand";

const useContentTypeStore = create((set) => ({
  contentType: "movie", // default content type
  setContentType: (type) => set({ contentType: type }),
}));

export default useContentTypeStore;
