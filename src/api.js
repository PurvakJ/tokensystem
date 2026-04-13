const API_URL = "https://script.google.com/macros/s/AKfycby3eqUsgmwrevvOZVicrFBiDhvSMw9xSmBT4eN30cIhp4VzP56XoSwYu14fBQ19tAiX/exec";

export const api = async (action, data = {}) => {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action, ...data })
    });

    const json = await res.json();
    return json;
  } catch (err) {
    return { success: false, error: "Network error: " + err.message };
  }
};