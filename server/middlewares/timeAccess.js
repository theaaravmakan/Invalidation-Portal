module.exports = function timeAccess(role) {
  return (req, res, next) => {
    // Temporarily disable time restriction for development
    return next();

    // ---- Old code (commented) ----
    /*
    if (role === "admin") {
      return next(); // Admin has full access
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const isAfternoon = hours === 13; // 1 PM hour
    const isNight = hours === 20; // 8 PM hour

    if (isAfternoon || isNight) {
      return next();
    }

    return res
      .status(403)
      .json({ message: "Access allowed only between 1–2 PM & 8–9 PM" });
    */
  };
};
