import { useEffect, useState, useRef } from "react";

export default function useBarcodeScanner({
  onScan,
  minLength = 3,
  timeThreshold = 100,
}) {
  const buffer = useRef("");
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      const char = e.key;

      // Ignore non-character keys (except Enter)
      if (char.length > 1 && char !== "Enter") {
        return;
      }

      // If time between keys is too long, reset buffer (it's likely manual typing)
      if (currentTime - lastKeyTime.current > timeThreshold) {
        buffer.current = "";
      }

      lastKeyTime.current = currentTime;

      if (char === "Enter") {
        if (buffer.current.length >= minLength) {
          // It's a valid scan
          e.preventDefault(); // Prevent default form submission or newline
          onScan(buffer.current);
          buffer.current = "";
        }
      } else {
        buffer.current += char;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onScan, minLength, timeThreshold]);
}
