"use client";

import { useEffect, useState, useRef } from "react";

interface TypedTextProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  showCursor?: boolean;
  deleteSpeed?: number;
}

export function TypedText({
  text,
  className = "",
  speed = 50,
  delay = 0,
  showCursor = true,
  deleteSpeed = 30,
}: TypedTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [targetText, setTargetText] = useState(text);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const containerRef = useRef<HTMLSpanElement>(null);

  // Capture container dimensions when text is fully typed
  useEffect(() => {
    if (
      displayedText === targetText &&
      targetText.length > 0 &&
      containerRef.current
    ) {
      const { offsetWidth, offsetHeight } = containerRef.current;
      setContainerDimensions({ width: offsetWidth, height: offsetHeight });
    }
  }, [displayedText, targetText]);

  // Handle text prop changes
  useEffect(() => {
    if (text !== targetText) {
      if (displayedText.length > 0) {
        setIsTyping(false);
        setIsDeleting(true);
      } else {
        setTargetText(text);
        setCurrentIndex(0);
        setIsTyping(true);
      }
    }
  }, [text, targetText, displayedText.length]);

  // Initial delay
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsTyping(true);
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay]);

  // Deletion effect
  useEffect(() => {
    if (!isDeleting) return;

    if (displayedText.length > 0) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev.slice(0, -1));
      }, deleteSpeed);

      return () => clearTimeout(timeout);
    } else {
      setIsDeleting(false);
      setTargetText(text);
      setCurrentIndex(0);
      setIsTyping(true);
    }
  }, [displayedText, isDeleting, text, deleteSpeed]);

  // Typing effect
  useEffect(() => {
    if (!isTyping || isDeleting) return;

    if (currentIndex < targetText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + targetText[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, isTyping, isDeleting, speed, targetText]);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 300);

    return () => clearInterval(cursorInterval);
  }, []);

  const containerStyle = {
    minWidth:
      containerDimensions.width > 0 ? `${containerDimensions.width}px` : "auto",
    minHeight:
      containerDimensions.height > 0
        ? `${containerDimensions.height}px`
        : "auto",
    display: "inline-block",
  };

  return (
    <span ref={containerRef} className={className} style={containerStyle}>
      {displayedText || "\u00A0"}
      {showCursor && (
        <span className="animate-pulse">{cursorVisible ? "_" : " "}</span>
      )}
    </span>
  );
}
