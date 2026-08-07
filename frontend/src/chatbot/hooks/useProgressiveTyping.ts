import { useState, useEffect, useRef } from 'react';

export interface TypingOptions {
  fullText: string;
  onComplete?: () => void;
  wordsPerMinute?: number;
}

export function useProgressiveTyping({
  fullText,
  onComplete,
  wordsPerMinute = 40,
}: TypingOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const animationRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  const start = () => {
    if (!fullText) {
      setDisplayedText('');
      return;
    }
    indexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);
    startTimeRef.current = null;
  };

  const stop = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsTyping(false);
    startTimeRef.current = null;
  };

  useEffect(() => {
    if (!isTyping) return;

       const wordsPerMs = wordsPerMinute / (60 * 1000);
      const msPerWord = 1 / wordsPerMs;
      const msPerChar = msPerWord / 6;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const targetChars = Math.floor(elapsed / msPerChar);

      if (targetChars >= fullText.length) {
        setDisplayedText(fullText);
        setIsTyping(false);
        startTimeRef.current = null;
        onComplete?.();
        return;
      }

      setDisplayedText(fullText.slice(0, targetChars + 1));
      indexRef.current = targetChars + 1;
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startTimeRef.current = null;
    };
  }, [isTyping, fullText, onComplete, wordsPerMinute]);

  useEffect(() => {
    return () => stop();
  }, []);

  return { displayedText, isTyping, start, stop };
}
