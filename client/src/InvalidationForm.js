import React, { useState } from "react";
import axios from "axios";

export default function InvalidateForm() {
  const [pathsInput, setPathsInput] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Split by new lines and filter empty
    const pathsArray = pathsInput
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p);

    if (pathsArray.length === 0) {
      setStatus("Please enter at least one path");
      return;
    }

    try {
      const res = await axios.post("/api/invalidate", { paths: pathsArray });
      setStatus(res.data.message);
    } catch (err) {
      setStatus("Error: " + err.response?.data?.message || err.message);
    }
  };

  return (
    <div>
      <h2>Bulk Invalidation</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          rows="6"
          cols="40"
          placeholder="/path1\n/path2\n/products/*"
          value={pathsInput}
          onChange={(e) => setPathsInput(e.target.value)}
        ></textarea>
        <br />
        <button type="submit">Invalidate</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
