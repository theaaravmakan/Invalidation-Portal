// middlewares/roleAndTimeAccess.js
module.exports = function roleAndTimeAccess(role) {
  return (req, res, next) => {
    const devMode = true; // 🔹 Change to false when deploying to prod

    // Always allow access in development
    if (devMode) return next();

    // Admin always has access
    if (role === "admin") return next();

    // Time restriction logic
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const inNoonSlot = hours === 12 || (hours === 13 && minutes === 0);
    const inNightSlot = hours === 20 || (hours === 21 && minutes === 0);

    if (inNoonSlot || inNightSlot) {
      return next();
    } else {
      return res
        .status(403)
        .json({ error: "Access restricted to 12–1 PM & 8–9 PM" });
    }
  };
};
